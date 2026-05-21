export interface InviteQuestion {
  id: string;
  invite_id: string;
  question_text: string;
  attached_photo_index: number | null; // null = after all photos
  require_answer: boolean;
  sort_order: number;
  created_at: string;
}

export interface InviteAnswer {
  id: string;
  question_id: string;
  answer: boolean; // true=YES false=NO
  answered_at: string;
  user_agent: string | null;
}

export interface QuestionWithAnswers extends InviteQuestion {
  invite_answers: InviteAnswer[];
}
