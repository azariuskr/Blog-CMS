import { Store } from "@tanstack/store";
import { createStoreHook, createActions } from "./core";

export type OverlayId =
    | "confirmDelete"
    | "confirmBan"
    | "editUser"
    | "createUser"
    | "mobileNav"
    | "userDetails"
    | "filters"
    | "notifications"
    | "settings"
    // Billing overlays
    | "upgradePlan"
    | "cancelSubscription"
    | "purchaseCredits"
    | "grantCredits"
    | "subscriptionDetails"
    | "customerDetails"
    | "invoiceDetails"
    | "changePlan"
    | "createCustomer"
    | "userPaymentHistory"
    | "addPaymentMethod"
    // E-commerce overlays
    | "confirmDeleteProduct"
    | "shipOrder"
    | "cancelOrder"
    | "adjustStock"
    | "createCoupon"
    | "editCoupon"
    | "deleteCoupon"
    | "createReview"
    | "viewReview"
    | "deleteReview"
    | "createBrand"
    | "editBrand"
    | "deleteBrand"
    | "createCategory"
    | "editCategory"
    | "deleteCategory"
    | "createColor"
    | "editColor"
    | "deleteColor"
    | "createSize"
    | "editSize"
    | "deleteSize"
    | "createVariant"
    | "editVariant"
    | "deleteVariant"
    | "generateVariants"
    | null;

export type OverlayType = "modal" | "drawer" | "sheet";
export type DrawerSide = "left" | "right";

interface OverlayState {
    id: OverlayId;
    data?: unknown;
}

const DEFAULTS: OverlayState = {
    id: null,
    data: undefined,
};

export const overlayStore = new Store<OverlayState>(DEFAULTS);

export const overlayActions = createActions(overlayStore, (setState) => ({
    open: <T = unknown>(id: OverlayId, data?: T) => {
        setState(() => ({ id, data }));
    },

    close: () => {
        setState(() => DEFAULTS);
    },

    updateData: <T = unknown>(data: T) => {
        setState((state) => ({ ...state, data }));
    },
}));

export const useOverlayStore = createStoreHook(overlayStore);

export function useOverlay() {
    const state = useOverlayStore((s) => s);

    return {
        ...state,
        ...overlayActions,
        isOpen: (id: OverlayId) => state.id === id,
    };
}

export const OVERLAY_CONFIG: Record<
    Exclude<OverlayId, null>,
    { type: OverlayType; side?: DrawerSide }
> = {
    confirmDelete: { type: "modal" },
    confirmBan: { type: "modal" },
    editUser: { type: "modal" },
    createUser: { type: "drawer", side: "right" },
    mobileNav: { type: "drawer", side: "left" },
    userDetails: { type: "drawer", side: "right" },
    filters: { type: "drawer", side: "right" },
    notifications: { type: "sheet" },
    settings: { type: "sheet" },
    // Billing overlays
    upgradePlan: { type: "modal" },
    cancelSubscription: { type: "modal" },
    purchaseCredits: { type: "modal" },
    grantCredits: { type: "modal" },
    subscriptionDetails: { type: "drawer", side: "right" },
    customerDetails: { type: "drawer", side: "right" },
    invoiceDetails: { type: "drawer", side: "right" },
    changePlan: { type: "modal" },
    createCustomer: { type: "modal" },
    userPaymentHistory: { type: "drawer", side: "right" },
    addPaymentMethod: { type: "modal" },
    // E-commerce overlays
    confirmDeleteProduct: { type: "modal" },
    shipOrder: { type: "modal" },
    cancelOrder: { type: "modal" },
    adjustStock: { type: "modal" },
    createCoupon: { type: "drawer", side: "right" },
    editCoupon: { type: "drawer", side: "right" },
    deleteCoupon: { type: "modal" },
    createReview: { type: "drawer", side: "right" },
    viewReview: { type: "drawer", side: "right" },
    deleteReview: { type: "modal" },
    createBrand: { type: "drawer", side: "right" },
    editBrand: { type: "drawer", side: "right" },
    deleteBrand: { type: "modal" },
    createCategory: { type: "drawer", side: "right" },
    editCategory: { type: "drawer", side: "right" },
    deleteCategory: { type: "modal" },
    createColor: { type: "modal" },
    editColor: { type: "modal" },
    deleteColor: { type: "modal" },
    createSize: { type: "modal" },
    editSize: { type: "modal" },
    deleteSize: { type: "modal" },
    createVariant: { type: "drawer", side: "right" },
    editVariant: { type: "drawer", side: "right" },
    deleteVariant: { type: "modal" },
    generateVariants: { type: "modal" },
};
