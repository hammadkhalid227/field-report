export type ServerImage = {
  id: string;
  clientId: string;
  position: number;
  url: string;
  bytes: number;
};

export type ServerReport = {
  id: string;
  clientId: string;
  description: string;
  status: string;
  images: ServerImage[];
};
