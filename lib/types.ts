export type NodeContentType = 'text' | 'voice' | 'image' | 'quote'
export type IdeaStatus = 'growing' | 'done'
export type ProjectStatus = 'active' | 'done'
export type ProjectKind = 'single' | 'book'
export type ChatRole = 'sparring' | 'researcher' | 'editor'
export type InputRole = 'user' | 'assistant'
export type ContainerType = 'idea' | 'project'

export interface IdeaNode {
  id: string
  user_id: string
  content: string | null
  content_type: NodeContentType
  image_url: string | null
  image_transcript?: string | null
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
  idea_id: string | null
  project_id?: string | null
  user_id: string
  content: string
  role: InputRole
  is_note?: boolean
  is_section?: boolean
  // Book-level open point — a question/uncertainty/TODO with no
  // chapter yet. Lives alongside Book Dump notes, distinguished
  // by this flag.
  is_open_point?: boolean
  starred?: boolean
  image_transcript?: string | null
  mirror_source_id?: string | null
  outline_order?: number | null
  used?: boolean
  chat_role?: ChatRole | null
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  title: string | null
  outline: string | null
  writing_content: string | null
  synthesis: string | null
  kernidee: string | null
  brain_dump: string | null
  // Book-level: who is this for? (one sentence)
  zielleser?: string | null
  // Book-level: recurring concepts/metaphors/arguments running through the book
  roter_faden?: string | null
  // Chapter-level: what role this chapter plays in the book (not its content)
  chapter_function?: string | null
  kind: ProjectKind
  parent_project_id: string | null
  chapter_order: number | null
  chat_role?: ChatRole
  source_idea_ids: string[]
  status: ProjectStatus
  created_at: string
  completed_at: string | null
}

// Shape returned from /api/ideas/[id] with inputs joined
export interface IdeaWithInputs extends Idea {
  inputs: Input[]
}

// Lernen — concept notes in your own words (Feynman) + connections
export interface Concept {
  id: string
  user_id: string
  title: string | null
  summary: string | null      // one sentence in own words
  own_example: string | null  // the concrete example that makes it stick
  body: string | null         // formal/scientific background
  source: string | null       // where you encountered it
  created_at: string
  updated_at: string
}

// Undirected (stored as a single directed row, queried both ways).
export interface ConceptLink {
  from_id: string
  to_id: string
  user_id: string
  // Short text on WHY the two concepts belong together.
  note: string | null
  created_at: string
}

// Handwerk — a permanent snippet (no promote, no AI)
export interface CraftSnippet {
  id: string
  user_id: string
  content: string
  mood: string | null
  kniff: string | null
  created_at: string
}
