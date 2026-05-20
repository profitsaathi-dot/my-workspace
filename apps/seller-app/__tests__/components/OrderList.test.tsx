import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderList } from '@/components/OrderList';

describe('OrderList Component', () => {
  const mockOrders = [
    {
      id: 1,
      orderNo: 'ORD-001',
      customerName: 'John Doe',
      product: { name: 'Product 1' },
      quantity: 2,
      unitPrice: 150,
      status: 'PENDING',
      createdAt: '2026-05-18T10:00:00',
    },
    {
      id: 2,
      orderNo: 'ORD-002',
      customerName: 'Jane Smith',
      product: { name: 'Product 2' },
      quantity: 1,
      unitPrice: 200,
      status: 'CONFIRMED',
      createdAt: '2026-05-18T11:00:00',
    },
  ];

  const mockOnStatusChange = jest.fn();
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render list of orders', () => {
    render(
      <OrderList
        orders={mockOrders}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display order totals correctly', () => {
    render(
      <OrderList
        orders={mockOrders}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Order 1: 2 * 150 = 300
    expect(screen.getByText('₹300')).toBeInTheDocument();
    // Order 2: 1 * 200 = 200
    expect(screen.getByText('₹200')).toBeInTheDocument();
  });

  it('should show order status badges', () => {
    render(
      <OrderList
        orders={mockOrders}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
  });

  it('should call onViewDetails when view button is clicked', () => {
    render(
      <OrderList
        orders={mockOrders}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
      />
    );

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);

    expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
    expect(mockOnViewDetails).toHaveBeenCalledWith(mockOrders[0]);
  });

  it('should call onStatusChange when status is updated', async () => {
    render(
      <OrderList
        orders={mockOrders}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
      />
    );

    const statusDropdown = screen.getAllByRole('combobox')[0];
    fireEvent.change(statusDropdown, { target: { value: 'SHIPPED' } });

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
      expect(mockOnStatusChange).toHaveBeenCalledWith(1, 'SHIPPED');
    });
  });

  it('should show empty state when no orders', () => {
    render(
      <OrderList
        orders={[]}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
  });

  it('should filter orders by status', () => {
    render(
      <OrderList
        orders={mockOrders}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
        filterStatus="PENDING"
      />
    );

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
  });

  it('should sort orders by date', () => {
    render(
      <OrderList
        orders={mockOrders}
        onStatusChange={mockOnStatusChange}
        onViewDetails={mockOnViewDetails}
        sortBy="date"
        sortOrder="desc"
      />
    );

    const orderNumbers = screen.getAllByText(/ORD-\d+/);
    expect(orderNumbers[0]).toHaveTextContent('ORD-002'); // Newer first
    expect(orderNumbers[1]).toHaveTextContent('ORD-001');
  });
});
