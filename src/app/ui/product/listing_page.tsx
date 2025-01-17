'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { fetchProductAll, deleteProductById } from '@/app/lib/actions';
import ProductSearch from '@/app/ui/search';
import styles from '@/app/products/listing/product_list.module.css';

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  discountPercent?: number;
  discountAbsolute?: number;
  sellerId?: number;
  image: {
    url: string;
  };
};

export default function ListingPage() {
  const router = useRouter();
  const { data: session, status } = useSession(); // Obtendo também o status da sessão
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }

    if (status === 'authenticated') {
      const fetchProducts = async () => {
        setIsLoading(true);
        try {
          let response;
          console.log('Session:', session);

          if (session && session.user.role === 'seller') {
            // Fetch only products for the logged-in seller
            const sellerId = parseInt(session.user.id, 10); // Convert sellerId to number
            response = await fetchProductAll(sellerId);
          } else {
            // Fetch all products for general users
            response = await fetchProductAll();
          }

          if (response) {
            const productData = response.map((product) => ({
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price,
              category: product.category,
              discountPercent: product.discountPercent,
              discountAbsolute: product.discountAbsolute,
              sellerId: product.seller.id,
              image: { url: product.image.url },
            }));

            setProducts(productData);
            setFilteredProducts(productData);
          } else {
            console.error('Failed to fetch products: No response');
          }
        } catch (error) {
          console.error('Failed to fetch products:', error);
        }
        setIsLoading(false);
      };

      fetchProducts();
    } else {
      setIsLoading(false);
    }
  }, [session, status]);

  const handleSearch = (searchTerm: string) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        product.description.toLowerCase().includes(lowerCaseSearchTerm) ||
        product.category.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setFilteredProducts(filtered);
  };

  const handleEditProduct = (productId: number) => {
    router.push(`/products/${productId}/edit`);
  };

  const handleDeleteProduct = async (productId: number) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this product?'
    );
    if (confirmDelete) {
      await deleteProductById(productId);
      setProducts(products.filter((product) => product.id !== productId));
      setFilteredProducts(
        filteredProducts.filter((product) => product.id !== productId)
      );
    }
  };

  const handleCreateProduct = () => {
    router.push('/products/create');
  };

  return (
    <div className={styles.container}>
      <h2>Product Listing Page</h2>

      {isLoading ? (
        <p>Loading products...</p>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.noProducts}>
          <p>You do not have any products registered.</p>
          <button
            onClick={handleCreateProduct}
            className={styles.addProductButton}
          >
            Add New Product
          </button>
        </div>
      ) : (
        <>
          {/* Search component */}
          <ProductSearch onSearch={handleSearch} />
          <button
            onClick={handleCreateProduct}
            className={styles.addProductButton}
          >
            Add New Product
          </button>

          {filteredProducts.map((product) => (
            <div key={product.id} className={styles.product}>
              <h3 className={styles.title}>{product.name}</h3>
              <Image
                src={product.image.url}
                alt={product.name}
                width={200}
                height={200}
                className={styles.productImage}
                unoptimized
              />
              <p className={styles.category}>Category: {product.category}</p>
              <p className={styles.description}>
                Description: {product.description}
              </p>
              <p className={styles.price}>Price: ${product.price.toFixed(2)}</p>
              <p className={styles.discountPercent}>
                Discount: {product.discountPercent}%
              </p>
              <div className={styles.buttonContainer}>
                <button
                  onClick={() => handleEditProduct(product.id)}
                  className={styles.editButton}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
