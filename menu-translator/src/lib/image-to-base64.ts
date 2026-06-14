export interface ImageBase64Result {
  base64: string
  mimeType: string
}

export function imageToBase64(file: File): Promise<ImageBase64Result> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const dataUrl = reader.result as string
      // dataUrl: "data:image/jpeg;base64,/9j/4AAQ..."
      const commaIndex = dataUrl.indexOf(",")
      const prefix = dataUrl.slice(0, commaIndex)
      const base64 = dataUrl.slice(commaIndex + 1)
      const mimeType = prefix.split(":")[1].split(";")[0]
      resolve({ base64, mimeType })
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })
}
