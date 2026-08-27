export function findPaymentRecord(tx, paymentId, companyId) {
  return tx.paymentRecord.findFirst({ where: { id: paymentId, company_id: companyId } });
}

export function findPaymentEvent(tx, companyId, provider, providerEventId) {
  return tx.paymentEvent.findUnique({
    where: { company_id_provider_provider_event_id: { company_id: companyId, provider, provider_event_id: providerEventId } },
  });
}

export function createPaymentEvent(tx, data) {
  return tx.paymentEvent.create({ data });
}

export function updatePaymentRecordStatus(tx, paymentId, companyId, status, fields = {}) {
  return tx.paymentRecord.updateMany({
    where: { id: paymentId, company_id: companyId },
    data: { status, ...fields },
  });
}

export default { findPaymentRecord, findPaymentEvent, createPaymentEvent, updatePaymentRecordStatus };
