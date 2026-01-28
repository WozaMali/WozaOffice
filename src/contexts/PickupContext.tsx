import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface PickupData {
  id: string;
  collectorId: string;
  collectorName: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  address: string;
  pickupDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  materials: Array<{
    type: string;
    kg: number;
    photos: string[];
    price: number;
    points: number;
  }>;
  totalKg: number;
  totalValue: number;
  totalPoints: number;
  notes?: string;
  adminNotes?: string;
  customerFeedback?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'wallet' | 'bank_transfer' | 'cash';
  environmentalImpact: {
    co2Saved: number;
    waterSaved: number;
    landfillSaved: number;
    treesEquivalent: number;
  };
}

interface PickupState {
  pickups: PickupData[];
  loading: boolean;
  error: string | null;
}

type PickupAction =
  | { type: 'ADD_PICKUP'; payload: PickupData }
  | { type: 'UPDATE_PICKUP_STATUS'; payload: { id: string; status: PickupData['status']; adminNotes?: string } }
  | { type: 'APPROVE_PICKUP'; payload: { id: string; adminNotes?: string } }
  | { type: 'REJECT_PICKUP'; payload: { id: string; adminNotes: string } }
  | { type: 'COMPLETE_PICKUP'; payload: { id: string; customerFeedback?: string } }
  | { type: 'UPDATE_PAYMENT_STATUS'; payload: { id: string; paymentStatus: PickupData['paymentStatus']; paymentMethod?: PickupData['paymentMethod'] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: PickupState = {
  pickups: [],
  loading: false,
  error: null,
};

function pickupReducer(state: PickupState, action: PickupAction): PickupState {
  switch (action.type) {
    case 'ADD_PICKUP':
      return {
        ...state,
        pickups: [...state.pickups, action.payload],
      };
    
    case 'UPDATE_PICKUP_STATUS':
      return {
        ...state,
        pickups: state.pickups.map(pickup =>
          pickup.id === action.payload.id
            ? { 
                ...pickup, 
                status: action.payload.status,
                adminNotes: action.payload.adminNotes || pickup.adminNotes
              }
            : pickup
        ),
      };
    
    case 'APPROVE_PICKUP':
      return {
        ...state,
        pickups: state.pickups.map(pickup =>
          pickup.id === action.payload.id
            ? { 
                ...pickup, 
                status: 'approved',
                adminNotes: action.payload.adminNotes || pickup.adminNotes
              }
            : pickup
        ),
      };
    
    case 'REJECT_PICKUP':
      return {
        ...state,
        pickups: state.pickups.map(pickup =>
          pickup.id === action.payload.id
            ? { 
                ...pickup, 
                status: 'rejected',
                adminNotes: action.payload.adminNotes
              }
            : pickup
        ),
      };
    
    case 'COMPLETE_PICKUP':
      return {
        ...state,
        pickups: state.pickups.map(pickup =>
          pickup.id === action.payload.id
            ? { 
                ...pickup, 
                status: 'completed',
                customerFeedback: action.payload.customerFeedback || pickup.customerFeedback
              }
            : pickup
        ),
      };
    
    case 'UPDATE_PAYMENT_STATUS':
      return {
        ...state,
        pickups: state.pickups.map(pickup =>
          pickup.id === action.payload.id
            ? { 
                ...pickup, 
                paymentStatus: action.payload.paymentStatus,
                paymentMethod: action.payload.paymentMethod || pickup.paymentMethod
              }
            : pickup
        ),
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    default:
      return state;
  }
}

interface PickupContextType {
  state: PickupState;
  addPickup: (pickup: Omit<PickupData, 'id' | 'pickupDate' | 'status' | 'paymentStatus'>) => void;
  approvePickup: (id: string, adminNotes?: string) => void;
  rejectPickup: (id: string, adminNotes: string) => void;
  completePickup: (id: string, customerFeedback?: string) => void;
  updatePaymentStatus: (id: string, paymentStatus: PickupData['paymentStatus'], paymentMethod?: PickupData['paymentMethod']) => void;
  getPickupsByCollector: (collectorId: string) => PickupData[];
  getPickupsByCustomer: (customerEmail: string) => PickupData[];
  getPendingPickups: () => PickupData[];
  getApprovedPickups: () => PickupData[];
  getCompletedPickups: () => PickupData[];
}

const PickupContext = createContext<PickupContextType | undefined>(undefined);

export function PickupProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pickupReducer, initialState);

  const addPickup = (pickupData: Omit<PickupData, 'id' | 'pickupDate' | 'status' | 'paymentStatus'>) => {
    const newPickup: PickupData = {
      ...pickupData,
      id: `pickup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pickupDate: new Date().toISOString(),
      status: 'pending',
      paymentStatus: 'pending',
    };
    
    dispatch({ type: 'ADD_PICKUP', payload: newPickup });
    
    // In a real app, this would send to backend
    console.log('New pickup added:', newPickup);
  };

  const approvePickup = (id: string, adminNotes?: string) => {
    dispatch({ type: 'APPROVE_PICKUP', payload: { id, adminNotes } });
    
    // In a real app, this would send to backend
    console.log('Pickup approved:', id, adminNotes);
  };

  const rejectPickup = (id: string, adminNotes: string) => {
    dispatch({ type: 'REJECT_PICKUP', payload: { id, adminNotes } });
    
    // In a real app, this would send to backend
    console.log('Pickup rejected:', id, adminNotes);
  };

  const completePickup = (id: string, customerFeedback?: string) => {
    dispatch({ type: 'COMPLETE_PICKUP', payload: { id, customerFeedback } });
    
    // In a real app, this would send to backend
    console.log('Pickup completed:', id, customerFeedback);
  };

  const updatePaymentStatus = (id: string, paymentStatus: PickupData['paymentStatus'], paymentMethod?: PickupData['paymentMethod']) => {
    dispatch({ type: 'UPDATE_PAYMENT_STATUS', payload: { id, paymentStatus, paymentMethod } });
    
    // In a real app, this would send to backend
    console.log('Payment status updated:', id, paymentStatus, paymentMethod);
  };

  const getPickupsByCollector = (collectorId: string) => {
    return state.pickups.filter(pickup => pickup.collectorId === collectorId);
  };

  const getPickupsByCustomer = (customerEmail: string) => {
    return state.pickups.filter(pickup => pickup.customerEmail === customerEmail);
  };

  const getPendingPickups = () => {
    return state.pickups.filter(pickup => pickup.status === 'pending');
  };

  const getApprovedPickups = () => {
    return state.pickups.filter(pickup => pickup.status === 'approved');
  };

  const getCompletedPickups = () => {
    return state.pickups.filter(pickup => pickup.status === 'completed');
  };

  const value: PickupContextType = {
    state,
    addPickup,
    approvePickup,
    rejectPickup,
    completePickup,
    updatePaymentStatus,
    getPickupsByCollector,
    getPickupsByCustomer,
    getPendingPickups,
    getApprovedPickups,
    getCompletedPickups,
  };

  return (
    <PickupContext.Provider value={value}>
      {children}
    </PickupContext.Provider>
  );
}

export function usePickup() {
  const context = useContext(PickupContext);
  if (context === undefined) {
    throw new Error('usePickup must be used within a PickupProvider');
  }
  return context;
}
