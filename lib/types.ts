export type NodeContentType = 'text' | 'voice' | 'image' | 'quote'
export type IdeaStatus = 'growing' | 'done'
export type InputRole = 'user' | 'assistant'

export interface IdeaNode {
  id: string
  user_id: string
  content: string | null
  content_type: NodeContentType
  image_url: string | null
  promoted: boolean
  created_at: string
}

export interface Idea {
  id: string
  user_id: string
  title: string | null
  synthesis: string | null
  status: IdeaStatus
  source_node_ids: string[]
  created_at: string
  completed_at: string | null
}

export interface Input {
  id: string
  idea_id: string
  user_id: string
  content: string
  role: InputRole
  is_note?: boolean
  created_at: string
}

// Shape returned from /api/ideas/[id] with inputs joined
export interface IdeaWithInputs extends Idea {
  inputs: Input[]
}
