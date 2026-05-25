import apiClient from './apiClient';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Customer {
  id:          string;
  tenantId:    string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone?:      string;
  address?:    string;
  city?:       string;
  country?:    string;
  zipCode?:    string;
  createdAt:   string;
  updatedAt:   string;
  orderCount:  number;
  totalSpent:  number;
}

export interface CustomerStats {
  total:        number;
  newThisMonth: number;
}

export interface CustomersResponse {
  customers:  Customer[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface CreateCustomerDto {
  firstName: string;
  lastName:  string;
  email:     string;
  phone?:    string;
  address?:  string;
  city?:     string;
  country?:  string;
  zipCode?:  string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface GetCustomersQuery {
  page?:   number;
  limit?:  number;
  search?: string;
}

// ── Service ────────────────────────────────────────────────────────────────

class CustomerService {
  private base = '/customers';

  async getAll(query: GetCustomersQuery = {}): Promise<CustomersResponse> {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== '' && v != null),
    );
    const res = await apiClient.get<{ data: CustomersResponse }>(this.base, { params });
    return res.data.data;
  }

  async getById(id: string): Promise<Customer> {
    const res = await apiClient.get<{ data: Customer }>(`${this.base}/${id}`);
    return res.data.data;
  }

  async getStats(): Promise<CustomerStats> {
    const res = await apiClient.get<{ data: CustomerStats }>(`${this.base}/stats`);
    return res.data.data;
  }

  async create(data: CreateCustomerDto): Promise<Customer> {
    const res = await apiClient.post<{ data: Customer }>(this.base, data);
    return res.data.data;
  }

  async update(id: string, data: UpdateCustomerDto): Promise<Customer> {
    const res = await apiClient.put<{ data: Customer }>(`${this.base}/${id}`, data);
    return res.data.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.base}/${id}`);
  }
}

export const customerService = new CustomerService();
