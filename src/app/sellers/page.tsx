'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import React from 'react';
import ProductListing from '@/app/ui/product/listing_page';
// import SellerBio from '../ui/sellers/seller-bio';
import { fetchSellerById } from '../lib/actions';
import { Seller } from '@prisma/client';

// This Define the Product type
interface Product {
  description: string;
  category: string;
  images: string[];
}

const SellerProfile = () => {
  const { data: session } = useSession();
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]); // This explicitly defines the state type
  const [productImages, setProductImages] = useState<string[]>([]); // Assuming images are URLs
  const [sellerData, setSellerData] = useState<Seller | null>(null);

  useEffect(() => {
    // This will clean up image URLs on unmount to prevent memory leaks
    fetchSellerById(session?.user.id | 0).then((fetchedSeller) => {
      setSellerData(fetchedSeller);
    });

    return () => {
      productImages.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
    };
  }, [productImages]);

  const handleAddProduct = () => {
    if (productDescription && productCategory && productImages.length > 0) {
      const newProduct: Product = {
        description: productDescription,
        category: productCategory,
        images: productImages,
      };
      setProducts((prevProducts) => [...prevProducts, newProduct]);
      setProductDescription('');
      setProductCategory('');
      setProductImages([]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imageUrls = Array.from(files).map((file) =>
        URL.createObjectURL(file)
      );
      setProductImages((prevImages) => [...prevImages, ...imageUrls]);
    }
  };

  // Safely check for session and session.user
  if (!session || !session.user || session.user.role != 'seller') {
    return (
      <div>
        <h1>Please sign in to access your profile.</h1>
        <button onClick={() => signIn()}>Sign In</button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <h2 style={{ color: 'var(--primary-fg)' }}>
        Welcome, {session.user.name}!
      </h2>
      <h2>Your Seller Profile</h2>
      <div
        style={{
          border: '1px solid var(--primary-fg)',
          padding: '1rem',
          borderRadius: '.5rem',
          boxShadow: '0 .1rem .5rem rgba(0,0,0,.2)',
        }}
      >
        <h3>Bio</h3>
        <dl>
          <dl>Display Name</dl>
          <dd>{sellerData?.displayName || ''}</dd>
          <dl>First Name</dl>
          <dd>{sellerData?.firstName || ''}</dd>
          <dl>Last Name</dl>
          <dd>{sellerData?.lastName || ''}</dd>
        </dl>
        <p
          style={{ backgroundColor: 'rgba(255,255,255,.5)', padding: '.5rem' }}
        >
          {sellerData?.bio || 'No Bio'}
        </p>
        {/* <SellerBio> */}

        {/* <h3>Add a Product</h3>

        <label>Product Description:</label>
        <textarea
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          placeholder="Describe your handcrafted item..."
        />

        <label>Product Category:</label>
        <select
          value={productCategory}
          onChange={(e) => setProductCategory(e.target.value)}
        >
          <option value="">Select a category</option>
          <option value="jewelry">Jewelry</option>
          <option value="home-decor">Home Decor</option>
          <option value="clothing">Clothing</option>
          <option value="art">Art</option>
          <option value="toys">Toys</option>
          <option value="craft-supplies">Craft Supplies</option>
        </select>

        <div style={{ padding: '20px', margin: '10px 0' }}>
          <label>Upload Images:</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
          />
        </div>

        <h4>Selected Images:</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          {productImages.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Product Image ${index + 1}`}
              style={{ width: '100px', height: '100px', objectFit: 'cover' }}
            />
          ))}
        </div>

        <button onClick={handleAddProduct}>Add Product</button> */}
      </div>
      <div
        style={{
          border: '1px solid var(--primary-fg)',
          padding: '1rem',
          borderRadius: '.5rem',
          boxShadow: '0 .1rem .5rem rgba(0,0,0,.2)',
        }}
      >
        {/* <h3>Your Products:</h3> */}
        <ProductListing />
        {/* <ul>
          {products.map((product, index) => (
            <li key={index}>
              <strong>Description:</strong> {product.description} <br />
              <strong>Category:</strong> {product.category} <br />
              <strong>Images:</strong> {product.images.length} image(s) uploaded
            </li>
          ))}
        </ul>

        <h3>Total Products: {products.length}</h3> */}
      </div>

      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

export default SellerProfile;
