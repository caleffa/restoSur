const repo = require('./afip.repository');

module.exports = {
  listCaea: (branchId) => repo.listCaea(branchId),
  createCaea: (data) => repo.createCaea(data),
  getById: (id) => repo.getById(id),
};
