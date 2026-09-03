export const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function lineTotal(line) {
  return (line.monthly_amounts || []).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function programUsage(programId, year, expenseReports, purchaseRequests) {
  const realized = expenseReports
    .filter((report) => report.program_id === programId && ["approved", "provisioned", "payment_scheduled", "paid"].includes(report.status))
    .flatMap((report) => report.expense_items || [])
    .filter((item) => Number(String(item.date || item.report_period_end || "").slice(0, 4)) === year)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  let sharedPurchases = 0;
  const committed = purchaseRequests
    .filter((request) => ["approved", "quotation", "ordered", "partially_received"].includes(request.status) && (request.program_ids || []).includes(programId))
    .filter((request) => Number(String(request.needed_by || request.created_at || "").slice(0, 4)) === year)
    .reduce((sum, request) => {
      const programs = Math.max((request.program_ids || []).length, 1);
      if (programs > 1) sharedPurchases += 1;
      return sum + Number(request.estimated_total || 0) / programs;
    }, 0);

  return { realized, committed, used: realized + committed, sharedPurchases };
}
