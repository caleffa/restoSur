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
          <p>Ventas: $${ticket.sales.toFixed(2)}</p>
          <p>Ingresos: $${ticket.incomes.toFixed(2)}</p>
          <p>Egresos: $${ticket.expenses.toFixed(2)}</p>
          <p>Saldo esperado: $${ticket.expected.toFixed(2)}</p>
          <p>Saldo real: $${ticket.real.toFixed(2)}</p>
          <p>Diferencia: $${ticket.difference.toFixed(2)}</p>
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
