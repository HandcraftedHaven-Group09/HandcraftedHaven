'use server';

import { put } from '@vercel/blob';
import { z } from 'zod';
import { PrismaClient, Seller } from '@prisma/client';
const prisma = new PrismaClient();
import {
  createImage,
  getUserByEmail,
  getSellerByEmail,
  createUser,
  createSeller,
  getListsByUser,
  addToUserList,
  getUserById,
  updateUserById,
  UpdateUserData,
  deleteUser,
  getSellerById,
} from './data';
// import { signIn } from 'next-auth/react';
import { signIn } from '../auth';
import { AuthError } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { describe } from 'node:test';
import { execSync } from 'node:child_process';
import { redirect } from 'next/navigation';

// For creating a new image record with new image
const CreateImageFormSchema = z.object({
  id: z.string(),
  description: z.string(),
  ownerId: z.string(),
});
// For signing up a new user manually.
const SignupUserFormSchema = z.object({
  id: z.bigint(),
  displayName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  password: z.string(),
});
// Form types
export type UserSignupFormState = {
  errors?: {
    email?: string[];
    displayName?: string[];
    firstName?: string[];
    lastName?: string[];
    password?: string[];
  };
  formData?: {
    email?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  };
  message?: string | null;
};
export type CreateImageState = {
  errors?: {
    description?: string[];
  };
  message?: string | null;
};

export type SellerSignupFormState = {
  errors?: {
    email?: string[];
    displayName?: string[];
    firstName?: string[];
    lastName?: string[];
    password?: string[];
  };
  formData?: {
    email?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  };
  message?: string | null;
};

/**
 * Create a new image record with accompanying file
 * @param prevState
 * @param formData
 * @returns
 */
export async function postImage(
  prevState: CreateImageState,
  formData: FormData
): Promise<CreateImageState> {
  try {
    const imageFile = formData.get('imageFile') as File;
    const blob = await put(imageFile.name, imageFile, {
      access: 'public',
    });

    const description = formData.get('description')?.toString() || '';
    const ownerId = Number(formData.get('description')?.toString()) || 1;

    createImage({
      url: blob.url,
      description: description,
      ownerId: ownerId,
    });
    return {
      message: `Success: ${blob.downloadUrl} created`,
      errors: {},
    };
  } catch (error) {
    return { errors: {}, message: 'Error adding file' };
  }
}

// Fetch image by ID
export async function fetchImageById(id: number) {
  const image = await prisma.image.findUnique({
    where: { id },
  });
  return image;
}

// Upload Image to Blob Storage
export async function uploadImage(formData: FormData) {
  try {
    const imageFile = formData.get('file') as File;

    // Check if the file exists
    if (!imageFile) {
      throw new Error('No file found in form data');
    }

    // Upload image to Blob storage
    const blob = await put(imageFile.name, imageFile, {
      access: 'public',
    });

    return { url: blob.url }; // Return the uploaded image URL
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Fetch all sellers (limit 10)
export async function fetchSellerAll() {
  const sellers = await prisma.seller.findMany({
    take: 10,
  });
  console.log('Sellers@actions ', sellers);
  return sellers;
}

// Fetch all products
export async function fetchProductAll(sellerId?: number) {
  try {
    return await prisma.product.findMany({
      where: sellerId ? { sellerId: sellerId } : {}, // Filter by sellerId if provided
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        discountPercent: true,
        discountAbsolute: true,
        image: { select: { url: true } },
        seller: { select: { displayName: true, id: true } },
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Create a new product in the database
export async function createNewProduct(productData: {
  name: string;
  description: string;
  price: number;
  category: string;
  discountPercent?: number;
  discountAbsolute?: number;
  sellerId: number;
  image: string;
}) {
  try {
    let discountAbsolute = productData.discountAbsolute;
    if (!discountAbsolute && productData.discountPercent) {
      discountAbsolute =
        (productData.price * productData.discountPercent) / 100;
    }

    // Create the new product with a single associated image
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category: productData.category,
        discountPercent: productData.discountPercent || 0,
        discountAbsolute: discountAbsolute || 0,
        seller: {
          connect: { id: productData.sellerId },
        },
        image: {
          create: {
            url: productData.image,
            description: productData.name,
          },
        },
      },
    });

    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

// Handle authentication for users
export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  'use client';
  console.log('FORM DATA: ', formData.get('email'));
  const email = formData.get('email');
  const password = formData.get('password');
  try {
    console.log('Trying to login');
    const result = await signIn('user-credentials', {
      redirect: true,
      email: email,
      password: password,
      role: 'user', // These fields go to authorize() in auth.ts
    });
    console.log('Immediate post login');
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

// Handle authentication for sellers
export async function authenticateSeller(
  prevState: string | undefined,
  formData: FormData
) {
  'use client';
  console.log('FORM DATA: ', formData.get('email'));
  const email = formData.get('email');
  const password = formData.get('password');
  try {
    console.log('Trying to login');
    const result = await signIn('seller-credentials', {
      // TODO Make this credentialsSeller...thing
      redirect: true,
      email: email,
      password: password,
      role: 'seller',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid seller credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

// Listing products category
export async function fetchCategories() {
  const categories = await prisma.product.findMany({
    select: {
      category: true,
    },
    distinct: ['category'],
  });

  return categories;
}

// Function to search product by ID
export async function fetchProductById(id: string) {
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    throw new Error(`Invalid product ID: ${id}`);
  }

  const product = await prisma.product.findUnique({
    where: { id: numericId },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      category: true,
      discountPercent: true,
      sellerId: true,
      image: { select: { url: true } },
      seller: { select: { id: true, displayName: true } },
      Reviews: {
        select: {
          id: true,
          rating: true,
          review: true,
          user: { select: { displayName: true } },
        },
      },
    },
  });

  if (!product) {
    throw new Error(`Product with ID ${numericId} not found.`);
  }

  // Sets the maximum note allowed
  const maxRating = 5;

  // Calculates the average of the ratings, limiting each rating between 1 and 5
  const averageRating =
    product.Reviews.reduce(
      (sum, review) => sum + Math.min(Math.max(review.rating, 1), maxRating),
      0
    ) / (product.Reviews.length || 1);

  return {
    ...product,
    averageRating: averageRating.toFixed(1),
    Reviews: product.Reviews,
    image: product.image ? { url: product.image.url } : { url: '' },
  };
}

// Function to update the product
export async function updateProduct(
  id: string,
  productData: {
    name: string;
    description: string;
    price: number;
    discountPercent?: number;
    category: string;
    image?: string;
  }
) {
  const productId = parseInt(id);

  if (isNaN(productId)) {
    throw new Error(`Invalid product ID: ${id}`);
  }

  // Fetch the existing product
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { image: true },
  });

  if (!existingProduct) {
    throw new Error(`Product with ID ${productId} not found.`);
  }

  const imageUrl = productData.image || existingProduct.image?.url || '';

  // Update the product in the database
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      category: productData.category,
      ...(productData.discountPercent !== undefined && {
        discountPercent: productData.discountPercent,
      }),
      image: imageUrl
        ? {
            upsert: {
              create: {
                url: imageUrl,
                description: productData.name,
              },
              update: {
                url: imageUrl,
              },
              where: {
                id: existingProduct.image?.id,
              },
            },
          }
        : undefined,
    },
  });
  return updatedProduct;
}

export async function deleteProductById(id: number) {
  try {
    await prisma.product.delete({
      where: { id },
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

const NewUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

const NewSellerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

export async function signupUser(
  prevState: UserSignupFormState | undefined,
  formData: FormData
): Promise<UserSignupFormState> {
  // Extract form data
  console.log('EXTRACT FORM');

  const extractedData = {
    email: formData.get('email')?.toString() || '',
    password: formData.get('password')?.toString() || '',
    displayName: formData.get('displayName')?.toString() || '',
    firstName: formData.get('firstName')?.toString() || '',
    lastName: formData.get('lastName')?.toString() || '',
  };
  //Check existing email
  const existingUser = await getUserByEmail(extractedData.email);

  if (!existingUser) {
    // Email is free, use it
    const parsedUserData = NewUserSchema.safeParse(extractedData);
    console.log('PARSED: ', parsedUserData);
    if (parsedUserData.success) {
      console.log('SUCCESS PATH');
      // Redirect to confirm? Just do it?
      const newUser = await createUser(parsedUserData.data);
      const result = await signIn('user-credentials', {
        redirect: true,
        email: newUser?.email,
        password: newUser?.credential,
        role: 'user', // These fields go to authorize() in auth.ts
        redirectTo: `/users/${newUser?.id}/success`,
      });
      // redirect('/users/signup/success');
      return {};
    }
    console.log('FAIL PATH');

    return {
      errors: parsedUserData.error.flatten().fieldErrors,
      formData: {
        displayName: extractedData.displayName,
        email: extractedData.email,
        firstName: extractedData.firstName,
        lastName: extractedData.lastName,
      },
      message: "Something's wrong, something's amiss!",
    };
  }
  return {
    formData: {
      displayName: extractedData.displayName,
      email: extractedData.email,
      firstName: extractedData.firstName,
      lastName: extractedData.lastName,
    },
    errors: { email: ['That email is already in use'] },
    message: "Something's wrong, something's amiss! email",
  };
}

export async function signupSeller(
  prevState: SellerSignupFormState | undefined,
  formData: FormData
): Promise<SellerSignupFormState> {
  // Extract form data
  console.log('EXTRACT FORM');

  const extractedData = {
    email: formData.get('email')?.toString() || '',
    password: formData.get('password')?.toString() || '',
    displayName: formData.get('displayName')?.toString() || '',
    firstName: formData.get('firstName')?.toString() || '',
    lastName: formData.get('lastName')?.toString() || '',
  };
  //Check existing email
  const existingSeller = await getSellerByEmail(extractedData.email);

  if (!existingSeller) {
    // Email is free, use it
    const parsedSellerData = NewSellerSchema.safeParse(extractedData);
    console.log('PARSED: ', parsedSellerData);
    if (parsedSellerData.success) {
      console.log('SUCCESS PATH');
      // Redirect to confirm? Just do it?
      const newSeller = await createSeller(parsedSellerData.data);
      const result = await signIn('seller-credentials', {
        redirect: true,
        email: newSeller?.email,
        password: newSeller?.password,
        role: 'user', // These fields go to authorize() in auth.ts
        redirectTo: `/sellers/${newSeller?.id}/success`,
      });
      // redirect('/users/signup/success');
      return {};
    }
    console.log('FAIL PATH');

    return {
      errors: parsedSellerData.error.flatten().fieldErrors,
      formData: {
        displayName: extractedData.displayName,
        email: extractedData.email,
        firstName: extractedData.firstName,
        lastName: extractedData.lastName,
      },
      message: "Something's wrong, something's amiss!",
    };
  }
  return {
    formData: {
      displayName: extractedData.displayName,
      email: extractedData.email,
      firstName: extractedData.firstName,
      lastName: extractedData.lastName,
    },
    errors: { email: ['That email is already in use'] },
    message: "Something's wrong, something's amiss! email",
  };
}

export async function fetchUserListAll(userId: number) {
  try {
    const lists = await getListsByUser(userId);
    console.log('Got lists');
    return lists;
  } catch (error) {
    console.log('Error', error);
    return [];
  }
}

export async function addProductToUserList(listId: number, productId: number) {
  try {
    const result = await addToUserList(productId, listId);
  } catch (error) {
    return 'error';
  }
}

export async function fetchUserById(userId: number) {
  const user = await getUserById(userId);
  return user;
}

export type UserUpdateFormState = {
  errors?: {
    displayName?: string[];
    firstName?: string[];
    lastName?: string[];
    bio?: string[];
    profilePictureFile?: string[];
  };
  formData?: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    profilePictureFile?: File;
  };
  message?: string | null;
};

export async function putUserById(
  prevState: UserUpdateFormState | undefined,
  formData: FormData
): Promise<UserUpdateFormState> {
  console.log('Update User start.');
  const id = Number(formData.get('userId')?.toString());
  const userData: UpdateUserData = {
    displayName: formData.get('displayName')?.toString() || undefined,
    firstName: formData.get('firstName')?.toString() || undefined,
    lastName: formData.get('lastName')?.toString() || undefined,
    bio: formData.get('bio')?.toString() || undefined,
    profilePictureFile:
      (formData.get('profilePicture') as File | null) || undefined,
  };

  console.log('USER DATA', userData, 'ID', id);

  const result = await updateUserById(id, userData);
  if (result) {
    redirect(`/users/${id}`);
    return { message: 'Successfully updated' };
  }
  return {
    message: 'Database Error.',
    formData: {
      displayName: userData.displayName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      bio: userData.bio,
    },
  };
}

export async function removeUser(userId: number) {
  console.log('DELETING USER');
  deleteUser(userId);
}

export async function fetchSellerById(
  sellerId: number
): Promise<Seller | null> {
  try {
    const seller = await getSellerById(sellerId);
    return seller;
  } catch (error) {
    console.error(error);
    return null;
  }
}
