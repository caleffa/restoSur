import { formatCurrency } from '../utils/formatters';

function PrintTicket({ ticket }) {
  if (!ticket) return null;

  const handlePrint = () => {
    const html = `
      <html>
        <head>
          <title>Cierre de Caja</title>
          <style>
            body{font-family: monospace; width:80mm; margin:0 auto; padding:6px;}
            h1{font-size:16px; text-align:center; margin:0 0 8px;}
            p{margin:4px 0; font-size:12px;}
            .line{border-top:1px dashed #333; margin:6px 0;}
          </style>
        </head>
        <body>
          <h1>CIERRE DE CAJA</h1>
          <p>Caja: ${ticket.registerName}</p>
          <p>Usuario: ${ticket.userName}</p>
          <p>Apertura: ${ticket.openedAt}</p>
          <p>Cierre: ${ticket.closedAt}</p>
          <div class="line"></div>
          <p>Ventas: ${formatCurrency(ticket.sales)}</p>
          <p>Ingresos: ${formatCurrency(ticket.incomes)}</p>
          <p>Egresos: ${formatCurrency(ticket.expenses)}</p>
          <p>Saldo esperado: ${formatCurrency(ticket.expected)}</p>
          <p>Saldo real: ${formatCurrency(ticket.real)}</p>
          <p>Diferencia: ${formatCurrency(ticket.difference)}</p>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'width=400,height=650');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <button type="button" className="touch-btn" onClick={handlePrint}>
      Imprimir cierre
    </button>
  );
}

export default PrintTicket;
