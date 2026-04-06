import http from './http';

const MOCK_KEY = 'cash_module_mock_v1';

function unwrap(response) {
  if (response?.ok === false) throw new Error(response.message || 'Error de API');
  return response?.data ?? response;
}

function readMock() {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // noop
  }
  return {
    registers: [
      { id: 1, name: 'Caja Principal', active: 1, created_at: new Date().toISOString() },
    ],
    current: { status: 'CERRADA', shift: null, movements: [], totals: { sales: 0, incomes: 0, expenses: 0, expectedBalance: 0, openingBalance: 0 } },
    shifts: [],
  };
}

function writeMock(state) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(state));
}

export async function getCashRegisters() {
  try {
    const { data } = await http.get('/cash-registers');
    return unwrap(data) || [];
  } catch {
    return readMock().registers;
  }
}

export async function createCashRegister(payload) {
  try {
    const { data } = await http.post('/cash-registers', payload);
    return unwrap(data);
  } catch {
    const state = readMock();
    const next = { id: Date.now(), name: payload.name, active: payload.active ? 1 : 0, created_at: new Date().toISOString() };
    state.registers = [next, ...state.registers];
    writeMock(state);
    return next;
  }
}

export async function updateCashRegister(id, payload) {
  try {
    const { data } = await http.put(`/cash-registers/${id}`, payload);
    return unwrap(data);
  } catch {
    const state = readMock();
    state.registers = state.registers.map((r) => (r.id === id ? { ...r, ...payload, active: payload.active ? 1 : 0 } : r));
    writeMock(state);
    return { id };
  }
}

export async function deleteCashRegister(id) {
  try {
    const { data } = await http.delete(`/cash-registers/${id}`);
    return unwrap(data);
  } catch {
    const state = readMock();
    state.registers = state.registers.filter((r) => r.id !== id);
    writeMock(state);
    return { id };
  }
}

export async function getCurrentCash() {
  try {
    const { data } = await http.get('/cash/current');
    return unwrap(data);
  } catch {
    return readMock().current;
  }
}

export async function openCash(payload) {
  try {
    const { data } = await http.post('/cash/open', payload);
    return unwrap(data);
  } catch {
    const state = readMock();
    const register = state.registers.find((r) => r.id === Number(payload.registerId));
    const shift = {
      id: Date.now(),
      register_id: Number(payload.registerId),
      register_name: register?.name || 'Caja',
      user_name: 'Usuario',
      opened_at: new Date().toISOString(),
      opening_balance: Number(payload.openingAmount),
      status: 'ABIERTA',
    };
    state.current = { status: 'ABIERTA', shift, movements: [], totals: { sales: 0, incomes: 0, expenses: 0, openingBalance: Number(payload.openingAmount), expectedBalance: Number(payload.openingAmount), cashSales: 0 } };
    writeMock(state);
    return { shiftId: shift.id };
  }
}

export async function closeCash(payload) {
  try {
    const { data } = await http.post('/cash/close', payload);
    return unwrap(data);
  } catch {
    const state = readMock();
    const expected = Number(state.current?.totals?.expectedBalance || 0);
    const real = Number(payload.realBalance || 0);
    const closed = {
      ...state.current.shift,
      closed_at: new Date().toISOString(),
      status: 'CERRADA',
      expected_balance: expected,
      real_balance: real,
      difference: Number((real - expected).toFixed(2)),
    };
    state.shifts = [closed, ...state.shifts];
    state.current = { status: 'CERRADA', shift: null, movements: [], totals: { sales: 0, incomes: 0, expenses: 0, expectedBalance: 0, openingBalance: 0 } };
    writeMock(state);
    return closed;
  }
}

export async function createIncome(payload) {
  const { data } = await http.post('/cash/income', payload);
  return unwrap(data);
}

export async function createExpense(payload) {
  const { data } = await http.post('/cash/expense', payload);
  return unwrap(data);
}

export async function getCashReports(params = {}) {
  try {
    const { data } = await http.get('/cash/reports', { params });
    return unwrap(data);
  } catch {
    const state = readMock();
    return {
      totals: { sales: 0, incomes: 0, expenses: 0, differences: 0, balance: 0 },
      movements: state.current.movements || [],
      shifts: state.shifts || [],
    };
  }
}

export async function getCashShifts(params = {}) {
  try {
    const { data } = await http.get('/cash/shifts', { params });
    return unwrap(data) || [];
  } catch {
    return readMock().shifts || [];
  }
}
