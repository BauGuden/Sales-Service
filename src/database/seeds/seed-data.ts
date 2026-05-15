export const GROUPS = [
  { id: 1, name: 'SERVICIOS VARIOS', accountId: 1 },
  { id: 2, name: 'AUXILIO MORTUORIO', accountId: 2 },
  { id: 3, name: 'FONDO DE RETIRO Y CUOTA MORTUORIA', accountId: 4 },
  { id: 4, name: 'PRESTAMOS Y DIVIDENDOS', accountId: 3 },
  { id: 5, name: 'HOTEL PARIS', accountId: 5 },
] as const;

export const PRODUCTS = [
  {
    name: 'Folder Complemento Economico',
    code: 'F-CE',
    price: 25,
    groupId: 1,
  },
  { name: 'Folder Fondo de Retiro', code: 'F-FR', price: 25, groupId: 3 },
  { name: 'Folder Cuota Mortuoria', code: 'F-CM', price: 25, groupId: 2 },
  { name: 'Folder Auxilio Mortuorio', code: 'F-AM', price: 25, groupId: 2 },
  {
    name: 'Folder Prestamo Sector Activo',
    code: 'F-PA',
    price: 25,
    groupId: 1,
  },
  {
    name: 'Folder Prestamo Sector Pasivo',
    code: 'F-PP',
    price: 15,
    groupId: 1,
  },
] as const;

export const PARAMETER = {
  id: 1,
  maxAmount: 0,
  maxProducts: 1,
} as const;
