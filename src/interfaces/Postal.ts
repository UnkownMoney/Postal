export interface IShippingMethod {
    expedited: boolean;
    method: string;
}

export interface IAddress {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface ILabel {
    id: number;
    content: string;
    from: IAddress;
    to: IAddress;
}

export interface IShipment {
    id: number;
    status: string;
    shippingMethod: IShippingMethod;
    label?: ILabel;
    cost: number;
    from: IAddress;
    to: IAddress;
}
