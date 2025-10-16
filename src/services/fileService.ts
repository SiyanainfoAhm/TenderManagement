import { supabase } from '@/lib/supabase'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  tender_id?: string
  created_at: string
}

export const fileService = {
  // Upload file to Supabase Storage
  async uploadFile(file: File, tenderId: string): Promise<UploadedFile> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `tenders/${tenderId}/${fileName}`

    const { data, error } = await supabase.storage
      .from('tender-attachments')
      .upload(filePath, file)

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tender-attachments')
      .getPublicUrl(filePath)

    return {
      id: data.path,
      name: file.name,
      size: file.size,
      type: file.type,
      url: urlData.publicUrl,
      tender_id: tenderId,
      created_at: new Date().toISOString()
    }
  },

  // Upload multiple files
  async uploadFiles(files: File[], tenderId: string): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, tenderId))
    return Promise.all(uploadPromises)
  },

  // Get files for a tender
  async getTenderFiles(tenderId: string): Promise<UploadedFile[]> {
    const { data, error } = await supabase.storage
      .from('tender-attachments')
      .list(`tenders/${tenderId}`)

    if (error) {
      throw new Error(`Failed to get files: ${error.message}`)
    }

    return data.map(file => ({
      id: file.name,
      name: file.name,
      size: file.metadata?.size || 0,
      type: file.metadata?.mimetype || 'application/octet-stream',
      url: supabase.storage.from('tender-attachments').getPublicUrl(`tenders/${tenderId}/${file.name}`).data.publicUrl,
      tender_id: tenderId,
      created_at: file.created_at
    }))
  },

  // Delete file
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('tender-attachments')
      .remove([filePath])

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  },

  // Download file
  async downloadFile(filePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('tender-attachments')
      .download(filePath)

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`)
    }

    return data
  }
}
