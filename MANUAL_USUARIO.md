# Manual de Usuario — Sistema RestoPOS (restoSur)

## Índice
1. [Introducción](#1-introducción)
2. [Objetivo del sistema](#2-objetivo-del-sistema)
3. [Perfiles de usuario y permisos](#3-perfiles-de-usuario-y-permisos)
4. [Pantalla de inicio de sesión](#4-pantalla-de-inicio-de-sesión)
5. [Navegación general del sistema](#5-navegación-general-del-sistema)
6. [Módulos operativos](#6-módulos-operativos)
   - 6.1 [Dashboard](#61-dashboard)
   - 6.2 [Mesas y apertura de ventas](#62-mesas-y-apertura-de-ventas)
   - 6.3 [POS (Punto de Venta)](#63-pos-punto-de-venta)
   - 6.4 [Comandas y Cocina](#64-comandas-y-cocina)
   - 6.5 [Caja](#65-caja)
   - 6.6 [Ventas, reportes y facturación](#66-ventas-reportes-y-facturación)
   - 6.7 [Stock y alertas](#67-stock-y-alertas)
   - 6.8 [Compras y recepción](#68-compras-y-recepción)
   - 6.9 [Administración / Maestros](#69-administración--maestros)
7. [Guías rápidas por rol](#7-guías-rápidas-por-rol)
8. [Flujos recomendados de trabajo](#8-flujos-recomendados-de-trabajo)
9. [Buenas prácticas de uso](#9-buenas-prácticas-de-uso)
10. [Mensajes frecuentes y resolución básica](#10-mensajes-frecuentes-y-resolución-básica)
11. [Consideraciones finales](#11-consideraciones-finales)

---

## 1. Introducción
Este manual describe cómo utilizar **RestoPOS**, el sistema de gestión gastronómica de `restoSur`, desde el punto de vista funcional y operativo diario.

Está pensado para usuarios de salón, caja, cocina y administración. Su objetivo es guiar paso a paso el uso de las pantallas principales, explicar qué puede hacer cada perfil y proponer un flujo de trabajo ordenado para operar sin errores.

---

## 2. Objetivo del sistema
RestoPOS centraliza la operación del local en un solo entorno:
- Gestión de mesas y apertura/cierre de ventas.
- Toma y seguimiento de pedidos (comandas) para cocina.
- Cobros, caja y reportes.
- Gestión de stock, productos, recetas y compras.
- Facturación y administración de datos maestros.

El sistema está diseñado para trabajar por **roles**, mostrando solo las funciones necesarias para cada usuario.

---

## 3. Perfiles de usuario y permisos
El sistema contempla los siguientes perfiles:

- **ADMIN**
  - Acceso total a operación, configuración, reportes y maestros.
  - Puede gestionar usuarios, áreas, productos, stock, compras, caja, ventas, facturación, cocina y parámetros administrativos.

- **CAJERO**
  - Opera mesas, caja, ventas, comandas, facturación, stock y recepción de órdenes de compra.
  - Sin permisos de administración completa de usuarios o catálogos sensibles.

- **MOZO**
  - Opera principalmente **Mesas** y acceso al **POS** de sus ventas.
  - Enfocado en atención de salón.

- **COCINA**
  - Opera **Comandas**, consulta dashboard de cocina y puede gestionar información funcional de productos/recetas según permisos definidos.

> Nota: si una sección no aparece en el menú, normalmente se debe a permisos del rol.

---

## 4. Pantalla de inicio de sesión
1. Ingresar usuario y contraseña.
2. Presionar **Iniciar sesión**.
3. Al validar credenciales, el sistema redirige automáticamente al **Dashboard**.

Recomendaciones:
- No compartir credenciales entre personas.
- Cerrar sesión al finalizar turno (botón de apagado en la barra superior).

---

## 5. Navegación general del sistema
La navegación se realiza desde la barra superior:

- **Menú principal por rol**: muestra módulos habilitados para el usuario.
- **Submenús**: algunos módulos tienen segundo nivel (por ejemplo Caja, Ventas, Compras, Maestros).
- **Campana de alertas**: informa artículos en stock mínimo.
- **Logo / versión**: identifica la instancia del sistema y versión.
- **Botón de cierre de sesión**: salida segura del usuario.

### Convenciones visuales habituales
- Botones de acción primaria: crear, guardar, confirmar.
- Botones de peligro: eliminar, cerrar turno, cancelar irreversible.
- Estados de mesas y comandas: se visualizan con color/etiqueta para lectura rápida.

---

## 6. Módulos operativos

## 6.1 Dashboard
El dashboard resume la operación en tiempo real.

Funciones principales:
- Ver resumen operativo del día.
- Visualizar mesas por estado (libres, ocupadas, cuenta pedida).
- Consultar ventas abiertas.
- Consultar productos destacados y rendimiento por hora.
- Ver alertas de stock bajo.
- En perfil cocina, visualizar comandas activas y actualizar estado.

Uso recomendado:
1. Revisar alertas al iniciar turno.
2. Controlar mesas pendientes de cobro.
3. Monitorear demoras de pedidos.

---

## 6.2 Mesas y apertura de ventas
El módulo Mesas permite administrar la ocupación del salón.

Acciones habituales:
- Ver estado actual de todas las mesas.
- Abrir una venta en mesa libre.
- Asignar mozo al abrir venta (cuando aplica).
- Ingresar a POS de una mesa ocupada para continuar operación.

Flujo sugerido:
1. Seleccionar mesa libre.
2. Abrir venta (con asignación de mozo si corresponde).
3. Cargar pedido en POS.
4. Enviar comanda a cocina.
5. Cobrar y cerrar venta.

---

## 6.3 POS (Punto de Venta)
El POS centraliza la carga y cobro de pedidos de mesa.

Operaciones típicas:
- Agregar productos al pedido.
- Modificar cantidades.
- Aplicar observaciones operativas del pedido.
- Enviar ítems a cocina.
- Registrar forma(s) de pago.
- Finalizar la venta.

Buenas prácticas en POS:
- Verificar mesa correcta antes de cargar.
- Confirmar productos y cantidades con el cliente.
- No cerrar venta hasta confirmar cobro total.

---

## 6.4 Comandas y Cocina
El módulo Comandas se usa para gestionar la preparación.

Permite:
- Ver comandas activas.
- Consultar detalle de cada pedido.
- Actualizar estado de preparación (según circuito interno del local).
- Coordinar salida de platos con salón/caja.

Recomendaciones:
- Actualizar estados en tiempo real para evitar confusiones.
- Priorizar comandas antiguas para reducir demoras.

---

## 6.5 Caja
Incluye operación de caja, administración de cajas y reportes.

Submódulos comunes:
- **Caja**: apertura, movimientos y cierre de turno.
- **Admin cajas** (ADMIN): configuración/seguimiento de cajas.
- **Reportes de caja**: análisis de movimientos y cierres.
- **Medios de pago**: alta/edición de métodos habilitados.

Flujo básico de caja:
1. Abrir caja al inicio del turno.
2. Registrar movimientos extraordinarios con motivo.
3. Conciliar cobros de ventas.
4. Realizar cierre y emitir/controlar reporte.

---

## 6.6 Ventas, reportes y facturación
Este bloque cubre gestión comercial y control.

Incluye:
- **Gestión de ventas**: consulta y seguimiento de operaciones.
- **Reporte de ventas**: métricas de facturación y volumen.
- **Reporte de ganancias**: control de margen/rentabilidad.
- **Facturación**: emisión y administración de comprobantes.

Consejos:
- Revisar ventas pendientes antes de cierre de jornada.
- Verificar datos fiscales del cliente antes de facturar.

---

## 6.7 Stock y alertas
El módulo de stock permite controlar existencias y prevenir quiebres.

Funciones:
- Consulta de stock por artículo.
- Definición/control de stock mínimo.
- Alertas automáticas visibles en la campana del menú.

Regla operativa:
- Si un artículo cae al mínimo, reponer o ajustar planificación de compras para no impactar ventas.

---

## 6.8 Compras y recepción
Gestiona abastecimiento del local.

Pantallas:
- **Órdenes de compra**: generación y seguimiento.
- **Recepciones**: ingreso real de mercadería recibida.

Flujo recomendado:
1. Crear orden de compra.
2. Confirmar recepción al llegar proveedor.
3. Validar cantidades y estado de ítems.
4. Impactar en stock.

---

## 6.9 Administración / Maestros
Sección orientada al mantenimiento de datos base.

Entidades frecuentes:
- Usuarios.
- Áreas y mapa del salón.
- Categorías y productos.
- Recetas.
- Artículos, tipos de artículo y unidades de medida.
- Clientes y proveedores.
- Motivos de caja.
- Tipos de IVA.
- Cocinas y tipos de cocina.

Recomendaciones de administración:
- Mantener catálogos depurados (sin duplicados).
- Desactivar antes de eliminar si un dato tiene histórico.
- Registrar cambios críticos fuera de horario pico.

---

## 7. Guías rápidas por rol

### 7.1 ADMIN
1. Ingresar a Dashboard.
2. Ver alertas críticas (stock/caja/ventas).
3. Controlar operación de mesas, caja y cocina.
4. Revisar reportes.
5. Mantener catálogos y parámetros.

### 7.2 CAJERO
1. Abrir caja.
2. Operar ventas desde mesas/POS.
3. Gestionar cobros y medios de pago.
4. Realizar facturación.
5. Cerrar caja con reporte.

### 7.3 MOZO
1. Ingresar a Mesas.
2. Abrir venta de mesa.
3. Cargar pedido en POS.
4. Enviar a cocina y hacer seguimiento.
5. Avisar para cobro/cierre cuando cliente lo solicite.

### 7.4 COCINA
1. Ingresar a Comandas.
2. Ordenar por antigüedad/prioridad.
3. Actualizar estado de preparación.
4. Coordinar entrega con salón.

---

## 8. Flujos recomendados de trabajo

### 8.1 Apertura de jornada
- Login con usuario personal.
- Verificación de dashboard y alertas.
- Apertura de caja.
- Confirmación de disponibilidad de stock crítico.

### 8.2 Atención de mesa
- Mesa libre → abrir venta.
- Cargar pedido en POS.
- Enviar comanda.
- Seguimiento de estado.
- Cobro y cierre.

### 8.3 Cierre de jornada
- Validar que no queden ventas abiertas.
- Cerrar caja y emitir reporte.
- Revisar alertas de stock para siguiente turno.
- Cerrar sesión.

---

## 9. Buenas prácticas de uso
- Operar siempre con usuario propio.
- Evitar múltiples sesiones del mismo usuario en distintos dispositivos.
- Guardar cambios antes de salir de cada pantalla.
- Verificar filtros/fechas al analizar reportes.
- Mantener actualizados productos, recetas y stock mínimo.

---

## 10. Mensajes frecuentes y resolución básica

- **“No autorizado / acceso denegado”**
  - El rol no tiene permisos para esa pantalla.
  - Acción: solicitar validación a ADMIN.

- **“No se pudieron cargar datos”**
  - Puede haber problema temporal de red o backend.
  - Acción: actualizar pantalla y reintentar.

- **Error al facturar**
  - Revisar datos fiscales, configuración y campos obligatorios.
  - Si persiste, escalar a soporte técnico.

- **Stock inconsistente**
  - Verificar recepciones, ventas pendientes y ajustes manuales.

---

## 11. Consideraciones finales
- Este manual está orientado al uso funcional diario.
- Para configuración técnica (infraestructura, variables de entorno, despliegue), consultar documentación técnica del proyecto.
- Se recomienda una capacitación inicial por rol y una práctica supervisada antes de operar en horario de alta demanda.

---

## Anexo A — Mapa funcional resumido por menú

### ADMIN
Dashboard · Usuarios · Mesas · Áreas · Mapa salón · Artículos · Tipos de artículos · Unidades · Stock · Compras · Maestros · Productos · Recetas · Caja · Reportes · Ventas · Facturación · Cocina.

### CAJERO
Dashboard · Mesas · Caja · Reportes de caja · Medios de pago · Stock · Recepción de OC · Ventas · Ganancias · Facturación · Comandas.

### MOZO
Dashboard · Mesas · POS por mesa.

### COCINA
Dashboard · Comandas · Productos · Recetas.
