export type KioskCustomer = {
  /**
   * id del cliente en el backend. null = registrado en el kiosko sin red: la orden
   * viaja con el snapshot del cliente y el backend lo busca o lo crea al sincronizar.
   */
  id: number | null;
  /** `local`: salió del caché del kiosko (sin red), no de una consulta en vivo. */
  source?: 'backend' | 'local';
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};
