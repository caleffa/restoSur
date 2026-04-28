import Navbar from '../components/Navbar';

const HELP_SECTIONS = [
  {
    title: '1) Flujo básico del sistema',
    points: [
      'Apertura de caja y verificación de medios de pago.',
      'Toma de mesas y carga de pedidos desde POS.',
      'Envío de comandas a cocina y seguimiento de estados.',
      'Cobro de ventas y emisión de comprobantes.',
      'Cierre de turno y control de reportes.',
    ],
  },
  {
    title: '2) Cómo tomar una mesa',
    points: [
      'Ingresá a Mesas y seleccioná una mesa en estado LIBRE.',
      'Si corresponde, asigná mozo y abrí la venta.',
      'La mesa pasa a estado OCUPADA y habilita el acceso al POS.',
    ],
    example: [
      'Ejemplo: Mesa 12 libre → clic en Mesa 12 → asignar “Juan Pérez” → confirmar apertura.',
      'Resultado esperado: la mesa figura como OCUPADA y se crea la venta activa.',
    ],
  },
  {
    title: '3) Cómo enviar pedidos a cocina (comandas)',
    points: [
      'Desde POS de la mesa, agregá productos al pedido.',
      'Revisá cantidades/notas y presioná “Enviar a cocina”.',
      'Seguimiento desde Comandas: pendiente, en preparación y listo.',
    ],
    example: [
      'Ejemplo: Mesa 12 agrega “2 Milanesas + 1 Agua”.',
      'Acción: enviar comanda.',
      'Resultado: cocina visualiza el pedido y actualiza su estado.',
    ],
  },
  {
    title: '4) Cómo cobrar una venta',
    points: [
      'En POS, verificá el detalle final y aplicá descuentos/recargos si corresponde.',
      'Seleccioná medio de pago y confirmá el cobro.',
      'Emití ticket/factura según configuración fiscal vigente.',
    ],
    example: [
      'Ejemplo: total $25.000, pago con tarjeta.',
      'Acción: seleccionar “Tarjeta”, confirmar y cerrar venta.',
      'Resultado: mesa vuelve a LIBRE y la operación queda registrada en ventas/caja.',
    ],
  },
  {
    title: '5) Cómo crear un artículo (stock)',
    points: [
      'Ir a Artículos > Artículos > Nuevo artículo.',
      'Completar nombre, tipo, unidad de medida, costo y parámetros de stock.',
      'Guardar y validar que aparezca en listado.',
    ],
  },
  {
    title: '6) Cómo crear un proveedor',
    points: [
      'Ir a Maestros > Proveedores > Nuevo proveedor.',
      'Completar razón social, CUIT, condición IVA y datos de contacto.',
      'Guardar y validar disponibilidad para órdenes de compra.',
    ],
  },
  {
    title: '7) Cómo crear una orden de compra',
    points: [
      'Ir a Compras > Órdenes de compra > Nueva orden.',
      'Seleccionar proveedor y fecha estimada.',
      'Agregar artículos con cantidad y costo estimado, luego confirmar.',
    ],
    example: [
      'Ejemplo: proveedor “Distribuidora Sur”, artículo “Queso mozzarella”, 10 kg.',
      'Resultado: orden creada con estado pendiente de recepción.',
    ],
  },
  {
    title: '8) Cómo recibir la orden y actualizar stock/costo',
    points: [
      'Ir a Compras > Recepciones y elegir la orden pendiente.',
      'Cargar cantidades recibidas y costos reales por artículo.',
      'Confirmar recepción total/parcial.',
      'El sistema actualiza existencias y recalcula costo de stock según configuración.',
    ],
    example: [
      'Ejemplo: se ordenaron 10 kg y se reciben 8 kg a costo actualizado.',
      'Resultado: stock suma 8 kg, queda saldo pendiente y se actualiza costo del artículo.',
    ],
  },
  {
    title: '9) Cómo crear productos de venta',
    points: [
      'Ir a Productos > Productos > Nuevo producto.',
      'Definir nombre comercial, categoría, precio, impuestos y estado.',
      'Asignar cocina/tipo de cocina cuando aplique.',
    ],
  },
  {
    title: '10) Cómo crear recetas',
    points: [
      'Ir a Productos > Recetas > Nueva receta.',
      'Seleccionar producto final y agregar insumos con cantidades por unidad.',
      'Guardar receta para habilitar consumo automático de stock en ventas.',
    ],
    example: [
      'Ejemplo: “Hamburguesa completa” consume pan 1 un, medallón 1 un, queso 1 feta.',
      'Resultado: al vender el producto, descuenta esos insumos del inventario.',
    ],
  },
  {
    title: '11) Configuración del sistema',
    points: [
      'Usuarios y roles: definir permisos por perfil (admin, cajero, mozo, cocina).',
      'Mesas y áreas: organizar salón y mapa visual de operación.',
      'Cajas y medios de pago: habilitar caja y métodos disponibles.',
      'Facturación: completar parámetros fiscales y comprobantes.',
    ],
  },
  {
    title: '12) Buenas prácticas operativas',
    points: [
      'Controlar alertas de stock mínimo durante el turno.',
      'Registrar correctamente ingresos/egresos de caja con motivos.',
      'Revisar reportes de ventas/ganancias para detectar desvíos.',
      'Mantener actualizados costos de artículos y recetas.',
    ],
  },
];

function HelpManual() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="content help-screen">
        <header className="help-header">
          <h2>Ayuda · Manual de usuario</h2>
          <p>
            Esta sección resume la operación básica de RestoPOS para que el equipo pueda
            trabajar con un flujo ordenado y consistente.
          </p>
        </header>

        <section className="help-grid">
          {HELP_SECTIONS.map((section) => (
            <article key={section.title} className="help-card">
              <h3>{section.title}</h3>
              <ul>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              {section.example ? (
                <div className="help-example">
                  <strong>Ejemplo práctico</strong>
                  <ul>
                    {section.example.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default HelpManual;
