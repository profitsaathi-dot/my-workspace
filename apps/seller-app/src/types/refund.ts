export interface RefundProof {
  id: number;
  orderId: number;
  reference: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundProofInput {
  reference: string;
  notes?: string | null;
}
