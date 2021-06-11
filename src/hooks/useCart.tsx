import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const { data: productToAdd } = await api.get(`/products/${productId}`)
      const findProduct = cart.find(product => product.id === productId);
      
      
      if(findProduct) {
        if(findProduct.amount >= stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        updateProductAmount({ productId, amount: findProduct.amount + 1 });
        return;
      }

      changeCartState([...cart, {...productToAdd, amount: 1 }]);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(product => product.id === productId);

      if(!findProduct) {
        throw new Error();
      }

      changeCartState(cart.filter(product => product.id !== productId));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if(amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      changeCartState(cart.map(product => {
        if(productId === product.id) {
          return {
            ...product,
            amount,
          }
        }

        return product;
      }));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  function changeCartState(state: Product[]) {
    setCart(state);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(state));
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
