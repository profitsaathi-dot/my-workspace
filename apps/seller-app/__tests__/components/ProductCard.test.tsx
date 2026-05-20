import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductCard } from '@/components/ProductCard';

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    description: 'Test Description',
    costPrice: 100,
    sellingPrice: 150,
    stockQuantity: 10,
    images: ['test-image.jpg'],
    active: true,
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render product information correctly', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('₹150')).toBeInTheDocument();
  });

  it('should calculate profit margin correctly', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Profit margin = ((150 - 100) / 150) * 100 = 33.33%
    expect(screen.getByText(/33\.33%/)).toBeInTheDocument();
  });

  it('should show stock quantity', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/10 in stock/i)).toBeInTheDocument();
  });

  it('should show out of stock when quantity is 0', () => {
    const outOfStockProduct = { ...mockProduct, stockQuantity: 0 };
    
    render(
      <ProductCard
        product={outOfStockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockProduct);
  });

  it('should call onDelete when delete button is clicked', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(mockProduct.id);
  });

  it('should show inactive badge when product is inactive', () => {
    const inactiveProduct = { ...mockProduct, active: false };
    
    render(
      <ProductCard
        product={inactiveProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
  });

  it('should display product image', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const image = screen.getByRole('img', { name: /test product/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('test-image.jpg'));
  });
});
