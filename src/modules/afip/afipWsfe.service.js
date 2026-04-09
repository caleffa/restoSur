const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const AppError = require('../../utils/appError');

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

function buildSoapEnvelope(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: action,
      },
      body: buildSoapEnvelope(body),
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new AppError(`Error SOAP AFIP (${response.status}): ${text.slice(0, 250)}`, 502);
    }

    return text;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AppError(
        `Timeout llamando a AFIP (${timeoutMs}ms). Reintentá o incrementá AFIP_WS_TIMEOUT_MS`,
        504
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function getWsaaCredentials(config, timeoutMs) {
  if (!config.cuit) throw new AppError('AFIP config: cuit es requerido', 400);
  if (!config.cert_path) throw new AppError('AFIP config: cert_path es requerido', 400);
  if (!config.key_path) throw new AppError('AFIP config: key_path es requerido', 400);

  const wsaaUrl = WSAA_URLS[config.environment];
  if (!wsaaUrl) throw new AppError(`Ambiente AFIP no soportado: ${config.environment}`, 400);

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

  if (!token || !sign) {
    throw new AppError('No se pudieron obtener token/sign desde WSAA', 502);
  }

  return { token, sign };
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
          <ImpNeto>${amount.toFixed(2)}</ImpNeto>
          <ImpOpEx>0.00</ImpOpEx>
          <ImpIVA>0.00</ImpIVA>
          <ImpTrib>0.00</ImpTrib>
          <MonId>PES</MonId>
          <MonCotiz>1.00</MonCotiz>
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
  requestCaeForInvoice,
};
