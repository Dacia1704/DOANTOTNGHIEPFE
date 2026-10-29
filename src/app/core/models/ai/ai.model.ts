/**
 * Model cho AI service (FastAPI).
 *
 * Response cua AI service KHONG dung wrapper ApiResponse cua Spring:
 * no tra JSON thuoc truc tiep.
 */

export interface AiListingItem {
  id: string;
  title: string;
  price: number;
  area_m2: number;
  price_text?: string;
  area_text?: string;
  ward_name?: string | null;
  ward_text?: string | null;
  room_type_name?: string | null;
  address_line?: string | null;
  amenities: string[];
}

export interface AiRecommendationItem {
  listing_id: string;
  title: string;
  price: number;
  area_m2: number;
  ward_name?: string | null;
  address_line?: string | null;
  room_type_name?: string | null;
  amenities: string[];
  score: number;
  breakdown: {
    profile: number;
    behavior: number;
    fresh: number;
    boost: number;
  };
}

export interface AiRecommendationResponse {
  request_id: string;
  cold_start: boolean;
  personalization_used: boolean;
  candidate_count: number;
  latency_ms: number;
  items: AiRecommendationItem[];
}

/** Su kien SSE tu /ai/chat. */
export interface AiChatMeta {
  request_id: string;
  conversation_id: string;
}

export interface AiChatToken {
  text: string;
}

export interface AiChatListings {
  items: AiListingItem[];
}

export interface AiChatDone {
  status: 'OK' | 'CLARIFY' | 'OUT_OF_SCOPE' | 'FAILED';
  message_id?: string | null;
  conversation_id?: string;
  request_id?: string;
}

export interface AiChatRetry {
  reason: string;
}

export interface AiFeedbackRequest {
  message_id: string;
  rating: 'UP' | 'DOWN';
  reason?: 'WRONG_FILTER' | 'IRRELEVANT' | 'SLOW' | 'OTHER';
  comment?: string;
}

export interface AiEventRequest {
  request_id: string;
  listing_id: string;
  event_type: 'IMPRESSION' | 'CLICK' | 'SAVE' | 'CONTACT';
  position?: number;
  source?: 'HOME' | 'SEARCH' | 'CHATBOT';
  model_version?: string;
}
