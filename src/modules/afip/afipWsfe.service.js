const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const AppError = require('../../utils/appError');
const { logInfo, logError } = require('../../utils/logger');

const execFileAsync = promisify(execFile);

const WSAA_URLS = {
  HOMOLOGACION: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  PRODUCCION: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

const WSFE_URLS = {
  HOMOLOGACION: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  PRODUCCION: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

const INVOICE_TYPE_TO_CBTE = {
  A: 1,
  B: 6,
  C: 11,
};

const CONDICION_IVA_RECEPTOR = {
  RESPONSABLE_INSCRIPTO: 1,
  SUJETO_EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  IVA_NO_ALCANZADO: 7,
  MONOTRIBUTISTA: 13,
  MONOTRIBUTO_SOCIAL: 15,
  PEQUENIO_CONTRIBUYENTE_EVENTUAL: 16,
};

const TA_CACHE_PATH = process.env.AFIP_TA_CACHE_FILE || path.join(process.cwd(), 'uploads', 'afip', 'ta-cache.json');
const TA_RENEWAL_SKEW_MS = Number(process.env.AFIP_TA_RENEWAL_SKEW_MS || 60 * 1000);
const TA_REQUEST_COOLDOWN_MS = {
  PRODUCCION: Number(process.env.AFIP_TA_COOLDOWN_PRODUCCION_MS || 2 * 60 * 1000),
  HOMOLOGACION: Number(process.env.AFIP_TA_COOLDOWN_HOMOLOGACION_MS || 10 * 60 * 1000),
};
const taCache = new Map();
const taInFlightRequests = new Map();
let taStoreLoaded = false;

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlUnescape(value = '') {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function getTaCacheKey({ cuit, environment, service = 'wsfe' }) {
  return `${environment || 'UNKNOWN'}:${cuit || 'NO_CUIT'}:${service}`;
}

function parseExpirationTime(rawValue) {
  if (!rawValue) return null;
  const expirationDate = new Date(rawValue);
  return Number.isNaN(expirationDate.getTime()) ? null : expirationDate.toISOString();
}

function isTaUsable(credentials) {
  if (!credentials?.token || !credentials?.sign || !credentials?.expirationTime) return false;
  const expirationMs = new Date(credentials.expirationTime).getTime();
  if (Number.isNaN(expirationMs)) return false;
  return Date.now() + TA_RENEWAL_SKEW_MS < expirationMs;
}

async function loadTaStoreIfNeeded() {
  if (taStoreLoaded) return;
  taStoreLoaded = true;

  try {
    const raw = await fs.promises.readFile(TA_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    Object.entries(parsed || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        taCache.set(key, value);
      }
    });
    logInfo('AFIP TA cache cargado desde archivo', { path: TA_CACHE_PATH, entries: taCache.size });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError('No se pudo cargar el cache de TA desde archivo; se continuará solo en memoria', {
        path: TA_CACHE_PATH,
        error: error.message,
      });
    }
  }
}

async function persistTaStore() {
  const payload = Object.fromEntries(taCache.entries());
  await fs.promises.mkdir(path.dirname(TA_CACHE_PATH), { recursive: true });
  await fs.promises.writeFile(TA_CACHE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

function getTaRequestCooldownMs(environment) {
  return TA_REQUEST_COOLDOWN_MS[environment] || TA_REQUEST_COOLDOWN_MS.HOMOLOGACION;
}

function buildSoapEnvelope(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
}

function formatDateYYYYMMDD(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getOpenSslBin() {
  return process.env.AFIP_OPENSSL_BIN || 'openssl';
}

function getOpenSslCandidates() {
  const preferred = getOpenSslBin();

  if (process.platform !== 'win32') {
    return [preferred];
  }

  const windowsCandidates = [
    preferred,
    'openssl.exe',
    'C:\\OpenSSL-Win64\\bin\\openssl.exe',
    'C:\\OpenSSL-Win32\\bin\\openssl.exe',
    'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\OpenSSL-Win32\\bin\\openssl.exe',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
  ];

  return [...new Set(windowsCandidates.filter(Boolean))];
}

async function signCms({ certPath, keyPath, traXml }) {
  const tempBase = path.join(os.tmpdir(), `restosur-afip-${crypto.randomUUID()}`);
  const traPath = `${tempBase}.xml`;
  const cmsPath = `${tempBase}.cms`;
  const opensslArgs = [
    'cms',
    '-sign',
    '-in',
    traPath,
    '-signer',
    certPath,
    '-inkey',
    keyPath,
    '-nodetach',
    '-binary',
    '-outform',
    'DER',
    '-out',
    cmsPath,
  ];

  try {
    await fs.promises.writeFile(traPath, traXml, 'utf8');
    const candidates = getOpenSslCandidates();
    let lastEnoentError = null;

    for (const bin of candidates) {
      try {
        await execFileAsync(bin, opensslArgs);
        const cmsDer = await fs.promises.readFile(cmsPath);
        return cmsDer.toString('base64');
      } catch (error) {
        if (error?.code === 'ENOENT') {
          lastEnoentError = error;
          continue;
        }
        throw new AppError(`No se pudo firmar el TRA de AFIP: ${error.message}`, 500);
      }
    }

    if (lastEnoentError) {
      throw lastEnoentError;
    }

    throw new AppError('No se pudo firmar el TRA de AFIP con los binarios configurados', 500);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new AppError(
        `No se encontró OpenSSL en el servidor. Instalá OpenSSL o configurá AFIP_OPENSSL_BIN con la ruta del binario. Error original: ${error.message}`,
        500
      );
    }

    throw new AppError(`No se pudo firmar el TRA de AFIP: ${error.message}`, 500);
  } finally {
    await Promise.allSettled([fs.promises.unlink(traPath), fs.promises.unlink(cmsPath)]);
  }
}

function buildTraXml(service = 'wsfe') {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const uniqueId = nowSeconds;
  const generation = new Date((nowSeconds - 60) * 1000).toISOString();
  const expiration = new Date((nowSeconds + 60 * 10) * 1000).toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generation}</generationTime>
    <expirationTime>${expiration}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

async function callSoap(url, action, body, timeoutMs = 10000) {
  const maxAttempts = 2;
  const soapActionValues = Array.from(new Set([`"${action}"`, action].filter(Boolean)));
  let lastError = null;

  for (const soapAction of soapActionValues) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: soapAction,
          },
          body: buildSoapEnvelope(body),
          signal: controller.signal,
        });

        const text = await response.text();
        const soapFaultMessage = extractTag(text, 'faultstring') || extractTag(text, 'faultcode');
        if (soapFaultMessage) {
          throw new AppError(`AFIP SOAP Fault: ${soapFaultMessage}`, 502);
        }

        if (!response.ok) {
          throw new AppError(`Error SOAP AFIP (${response.status}): ${text.slice(0, 500)}`, 502);
        }

        return text;
      } catch (error) {
        lastError = error;
        const isTimeout = error?.name === 'AbortError';
        if (!isTimeout || attempt === maxAttempts) {
          if (isTimeout) {
            throw new AppError(
              `Timeout llamando a AFIP (${timeoutMs}ms). Reintentá o incrementá AFIP_WS_TIMEOUT_MS`,
              504
            );
          }

          // El SOAPAction puede variar entre implementaciones.
          // Si falla con un formato, se reintenta con el alternativo.
          if (soapAction !== soapActionValues[soapActionValues.length - 1]) {
            break;
          }

          throw error;
        }
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw lastError;
}

function normalizeAmount(value) {
  return Number(Number(value).toFixed(2));
}

function buildTaxData(amount, invoiceType) {
  // Para comprobantes A/B el WSFE requiere discriminar IVA si ImpNeto > 0.
  if (invoiceType === 'A' || invoiceType === 'B') {
    const net = normalizeAmount(amount / 1.21);
    const iva = normalizeAmount(amount - net);
    return {
      impNeto: net,
      impIva: iva,
      ivaDetailsXml: `<Iva>
            <AlicIva>
              <Id>5</Id>
              <BaseImp>${net.toFixed(2)}</BaseImp>
              <Importe>${iva.toFixed(2)}</Importe>
            </AlicIva>
          </Iva>`,
    };
  }

  // En factura C no se discrimina IVA.
  return {
    impNeto: amount,
    impIva: 0,
    ivaDetailsXml: '',
  };
}

async function getWsaaCredentials(config, timeoutMs) {
  if (!config.cuit) throw new AppError('AFIP config: cuit es requerido', 400);
  if (!config.cert_path) throw new AppError('AFIP config: cert_path es requerido', 400);
  if (!config.key_path) throw new AppError('AFIP config: key_path es requerido', 400);

  const wsaaUrl = WSAA_URLS[config.environment];
  if (!wsaaUrl) throw new AppError(`Ambiente AFIP no soportado: ${config.environment}`, 400);

  await loadTaStoreIfNeeded();
  const cacheKey = getTaCacheKey({ cuit: config.cuit, environment: config.environment, service: 'wsfe' });
  const cached = taCache.get(cacheKey);

  if (isTaUsable(cached)) {
    logInfo('AFIP TA cache hit', {
      key: cacheKey,
      expirationTime: cached.expirationTime,
    });
    return {
      token: cached.token,
      sign: cached.sign,
      expirationTime: cached.expirationTime,
    };
  }

  if (taInFlightRequests.has(cacheKey)) {
    logInfo('AFIP TA request en curso, esperando resultado compartido', { key: cacheKey });
    return taInFlightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    const lastRequestedAtMs = Number(cached?.lastRequestedAtMs || 0);
    const cooldownMs = getTaRequestCooldownMs(config.environment);
    const elapsedMs = Date.now() - lastRequestedAtMs;
    if (lastRequestedAtMs > 0 && elapsedMs < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      throw new AppError(
        `Cooldown WSAA activo. Reintentá en ~${remainingSeconds}s para evitar alreadyAuthenticated.`,
        429
      );
    }

    logInfo('Solicitando nuevo TA a WSAA', { key: cacheKey, environment: config.environment });
    const traXml = buildTraXml('wsfe');
    const cmsBase64 = await signCms({
      certPath: config.cert_path,
      keyPath: config.key_path,
      traXml,
    });

    const body = `<loginCms xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov"><in0>${xmlEscape(cmsBase64)}</in0></loginCms>`;
    const soap = await callSoap(wsaaUrl, 'loginCms', body, timeoutMs);

    const loginCmsReturnEscaped = extractTag(soap, 'loginCmsReturn');
    if (!loginCmsReturnEscaped) {
      throw new AppError('WSAA no devolvió loginCmsReturn', 502);
    }

    const ticketXml = xmlUnescape(loginCmsReturnEscaped);
    const token = extractTag(ticketXml, 'token');
    const sign = extractTag(ticketXml, 'sign');
    const expirationTime = parseExpirationTime(extractTag(ticketXml, 'expirationTime'));

    if (!token || !sign || !expirationTime) {
      throw new AppError('No se pudieron obtener token/sign/expirationTime desde WSAA', 502);
    }

    const nextCredentials = {
      token,
      sign,
      expirationTime,
      lastRequestedAtMs: Date.now(),
      environment: config.environment,
      cuit: config.cuit,
      service: 'wsfe',
    };

    taCache.set(cacheKey, nextCredentials);
    await persistTaStore();
    logInfo('Nuevo TA de AFIP obtenido y persistido', {
      key: cacheKey,
      expirationTime,
    });

    return {
      token,
      sign,
      expirationTime,
    };
  })();

  taInFlightRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } catch (error) {
    const cachedBeforeError = taCache.get(cacheKey);
    const faultAlreadyAuthenticated =
      typeof error?.message === 'string' &&
      error.message.toLowerCase().includes('alreadyauthenticated') &&
      cachedBeforeError &&
      cachedBeforeError.token &&
      cachedBeforeError.sign;

    if (faultAlreadyAuthenticated) {
      logInfo('WSAA respondió alreadyAuthenticated; se reutiliza TA cacheado localmente', {
        key: cacheKey,
        expirationTime: cachedBeforeError.expirationTime,
      });
      return {
        token: cachedBeforeError.token,
        sign: cachedBeforeError.sign,
        expirationTime: cachedBeforeError.expirationTime,
      };
    }

    throw error;
  } finally {
    taInFlightRequests.delete(cacheKey);
  }
}

async function getLastAuthorizedVoucher({ config, credentials, cbteTipo, timeoutMs }) {
  const wsfeUrl = WSFE_URLS[config.environment];
  const { token, sign } = credentials;

  const body = `<FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">
    <Auth>
      <Token>${xmlEscape(token)}</Token>
      <Sign>${xmlEscape(sign)}</Sign>
      <Cuit>${xmlEscape(config.cuit)}</Cuit>
    </Auth>
    <PtoVta>${Number(config.point_of_sale)}</PtoVta>
    <CbteTipo>${cbteTipo}</CbteTipo>
  </FECompUltimoAutorizado>`;

  const soap = await callSoap(wsfeUrl, 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado', body, timeoutMs);

  const errorsSection = extractTag(soap, 'Errors');
  if (errorsSection) {
    const msg = extractTag(errorsSection, 'Msg') || 'Error al consultar último comprobante';
    throw new AppError(`AFIP FECompUltimoAutorizado: ${msg}`, 502);
  }

  const cbteNro = Number(extractTag(soap, 'CbteNro'));
  return Number.isFinite(cbteNro) ? cbteNro : 0;
}

function getCondicionIvaReceptor({ invoiceType, docTipo, docNro }) {
  // RG 5616: en FECAESolicitar es obligatorio informar CondicionIVAReceptorId.
  // Con DocTipo=99 y DocNro=0 se factura a Consumidor Final.
  if (Number(docTipo) === 99 && Number(docNro) === 0) {
    return CONDICION_IVA_RECEPTOR.CONSUMIDOR_FINAL;
  }

  // Fallback seguro para el flujo actual: si no hay padrón de clientes,
  // mantener Consumidor Final en comprobantes B/C.
  if (invoiceType === 'B' || invoiceType === 'C') {
    return CONDICION_IVA_RECEPTOR.CONSUMIDOR_FINAL;
  }

  return CONDICION_IVA_RECEPTOR.RESPONSABLE_INSCRIPTO;
}

async function requestCaeForInvoice({ config, invoiceType, total, timeoutMs }) {
  try {
    const cbteTipo = INVOICE_TYPE_TO_CBTE[invoiceType];
    if (!cbteTipo) throw new AppError(`Tipo de factura no soportado: ${invoiceType}`, 400);

    const wsfeUrl = WSFE_URLS[config.environment];
    const credentials = await getWsaaCredentials(config, timeoutMs);
    const { token, sign } = credentials;
    const last = await getLastAuthorizedVoucher({ config, credentials, cbteTipo, timeoutMs });
    const nextVoucher = last + 1;
    const issueDate = formatDateYYYYMMDD(new Date());

    const amount = Number(total);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(`Total inválido para AFIP: ${total}`, 400);
    }

    const docTipo = 99;
    const docNro = 0;
    const condicionIvaReceptorId = getCondicionIvaReceptor({ invoiceType, docTipo, docNro });
    const taxData = buildTaxData(amount, invoiceType);

    const body = `<FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">
    <Auth>
      <Token>${xmlEscape(token)}</Token>
      <Sign>${xmlEscape(sign)}</Sign>
      <Cuit>${xmlEscape(config.cuit)}</Cuit>
    </Auth>
    <FeCAEReq>
      <FeCabReq>
        <CantReg>1</CantReg>
        <PtoVta>${Number(config.point_of_sale)}</PtoVta>
        <CbteTipo>${cbteTipo}</CbteTipo>
      </FeCabReq>
      <FeDetReq>
        <FECAEDetRequest>
          <Concepto>1</Concepto>
          <DocTipo>${docTipo}</DocTipo>
          <DocNro>${docNro}</DocNro>
          <CondicionIVAReceptorId>${condicionIvaReceptorId}</CondicionIVAReceptorId>
          <CbteDesde>${nextVoucher}</CbteDesde>
          <CbteHasta>${nextVoucher}</CbteHasta>
          <CbteFch>${issueDate}</CbteFch>
          <ImpTotal>${amount.toFixed(2)}</ImpTotal>
          <ImpTotConc>0.00</ImpTotConc>
          <ImpNeto>${taxData.impNeto.toFixed(2)}</ImpNeto>
          <ImpOpEx>0.00</ImpOpEx>
          <ImpIVA>${taxData.impIva.toFixed(2)}</ImpIVA>
          <ImpTrib>0.00</ImpTrib>
          <MonId>PES</MonId>
          <MonCotiz>1.00</MonCotiz>
          ${taxData.ivaDetailsXml}
        </FECAEDetRequest>
      </FeDetReq>
    </FeCAEReq>
  </FECAESolicitar>`;

    const soap = await callSoap(wsfeUrl, 'http://ar.gov.afip.dif.FEV1/FECAESolicitar', body, timeoutMs);

    const result = extractTag(soap, 'Resultado');
    const cae = extractTag(soap, 'CAE');
    const caeDue = extractTag(soap, 'CAEFchVto');
    const observedVoucher = Number(extractTag(soap, 'CbteDesde') || nextVoucher);

    if (result !== 'A' || !cae) {
      const errorsSection = extractTag(soap, 'Errors');
      const eventsSection = extractTag(soap, 'Events');
      const msg = extractTag(errorsSection || eventsSection || soap, 'Msg') || 'AFIP rechazó el comprobante';
      throw new AppError(`AFIP FECAESolicitar rechazado: ${msg}`, 502);
    }

    return {
      voucherNumber: observedVoucher,
      cae,
      caeExpiration: caeDue ? `${caeDue.slice(0, 4)}-${caeDue.slice(4, 6)}-${caeDue.slice(6, 8)}` : null,
      rawResult: {
        resultado: result,
        cae,
        caeVto: caeDue,
        cbteTipo,
        puntoVenta: Number(config.point_of_sale),
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error inesperado integrando AFIP: ${error.message}`, 502);
  }
}

module.exports = {
  getTA: getWsaaCredentials,
  requestCaeForInvoice,
};
