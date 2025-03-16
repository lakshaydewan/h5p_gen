"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Loader2, ArrowRight, Undo2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface UploadedFile {
  type: string
  downloadUrl: string
}

interface Word {
  fixWord: false
  orientation: "across" | "down"
  clue: string
  answer: string
}

export default function H5PGenerator() {
  const [loading, setLoading] = useState(false)
  const [contentType, setContentType] = useState("CrossWords")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [creationMode, setCreationMode] = useState<"selection" | "premade" | "scratch">("selection")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const [wordsData, setWordsData] = useState<Word[]>([])
  const [textField, setTextField] = useState("")
  const [clue, setClue] = useState("")
  const [answer, setAnswer] = useState("")
  const [direction, setDirection] = useState("across")
  const [error, setError] = useState("");

  const handleCreateContent = async (mode: "premade" | "scratch") => {
    setLoading(true)
    try {
      const payload =
        mode === "premade"
          ? { contentType }
          : {
            contentType,
            customData: {
              title,
              description,
            },
          }

      const res = await fetch("/api", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      const downloadUrl = data.uploadedFile?.[0]?.data?.ufsUrl
      const type = data.contentType
      setUploadedFiles([...uploadedFiles, { type, downloadUrl }])
    } catch (error) {
      console.error("Error creating H5P content:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetToSelection = () => {
    setCreationMode("selection")
  }

  const renderSelectionScreen = () => (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="border border-border hover:border-primary/50 transition-all cursor-pointer"
          onClick={() => setCreationMode("premade")}
        >
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Use Premade Content</h3>
            <p className="text-muted-foreground">
              Quick and easy. Select from our library of ready-to-use H5P content.
            </p>
            <Button variant="ghost" className="mt-4 group">
              Get Started <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="border border-border hover:border-primary/50 transition-all cursor-pointer"
          onClick={() => setCreationMode("scratch")}
        >
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Create From Scratch</h3>
            <p className="text-muted-foreground">
              Full customization. Build your own H5P content with your specific requirements.
            </p>
            <Button variant="ghost" className="mt-4 group">
              Start Creating <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderPremadeScreen = () => (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={resetToSelection} className="p-0 h-8">
          <Undo2 className="h-4 w-4 mr-2" /> Back to options
        </Button>
      </div>

      <div>
        <label htmlFor="content-type" className="text-sm font-medium">
          Content Type
        </label>
        <Select onValueChange={(value) => setContentType(value)} defaultValue="CrossWords">
          <SelectTrigger id="content-type" className="w-full">
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CrossWords">CrossWords</SelectItem>
            <SelectItem value="DragAndDrop">Drag and Drop</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={() => handleCreateContent("premade")}
        disabled={loading}
        className="w-full cursor-pointer h-11 text-md transition-all"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Premade Content"
        )}
      </Button>
    </div>
  )

  const renderScratchScreen = () => {

    return (
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" onClick={resetToSelection} className="p-0 h-8">
            <Undo2 className="h-4 w-4 mr-2" /> Back to options
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="content-type">Content Type</Label>
            <Select onValueChange={(value) => setContentType(value)} defaultValue="CrossWords">
              <SelectTrigger id="content-type">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CrossWords">CrossWords</SelectItem>
                <SelectItem value="DragTheWords">Drag The Words</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter a title for your content"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your content"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {contentType === "CrossWords" && (
            <div className="space-y-1.5">
              <Label>Crossword Clues and Answers</Label>
              <div className="flex items-center gap-0.5 justify-between">
                <Input
                  id={`clue`}
                  placeholder={`clue`}
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                />
                <Input
                  id={`answer`}
                  placeholder={`answer`}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <Select onValueChange={(value) => setDirection(value)} defaultValue="across">
                  <SelectTrigger id="">
                    <SelectValue placeholder="Orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="across">across</SelectItem>
                    <SelectItem value="down">down</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="md:block hidden" type="button" variant="outline" size="sm" onClick={
                  () => {
                    if (clue.trim() === "" || answer.trim() === "") {
                      setTimeout(() => setError(""), 2000)
                      return setError("Clue and Answer cannot be empty")
                    }
                    setWordsData([...wordsData, { fixWord: false, orientation: direction as "across" | "down", clue: clue, answer: answer }])
                    setClue("")
                    setAnswer("")
                  }
                }>
                  Add Words
                </Button>
              </div>
              <Button className="md:hidden w-full block" type="button" variant="outline" size="sm" onClick={
                () => {
                  if (clue.trim() === "" || answer.trim() === "") {
                    setTimeout(() => setError(""), 2000)
                    return setError("Clue and Answer cannot be empty")
                  }
                  setWordsData([...wordsData, { fixWord: false, orientation: direction as "across" | "down", clue: clue, answer: answer }])
                  setClue("")
                  setAnswer("")
                }
              }>
                Add Words
              </Button>
              {wordsData.map((word, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`clue-${index}`} className="sr-only">
                      Clue {index + 1}
                    </Label>
                    <Input
                      id={`clue-${index}`}
                      placeholder={`clue ${index + 1}`}
                      value={word.clue}
                      readOnly
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`answer-${index}`} className="sr-only">
                        Answer {index + 1}
                      </Label>
                      <Input
                        id={`answer-${index}`}
                        placeholder={`answer ${index + 1}`}
                        value={word.answer}
                        readOnly
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setWordsData(wordsData.filter((_, i) => i !== index))}
                      className="h-10 w-10 text-destructive"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {contentType === "DragTheWords" && (
            <div className="space-y-1.5">
              <Label htmlFor="textField">
                Text Field (use * to mark draggable words, e.g. &quot;The *quick* brown *fox*&quot;)
              </Label>
              <Textarea
                id="textField"
                placeholder={`Blueberries are *blue:Check the name of the berry!*.
Strawberries are *red*.
Cloudberries are *orange*.`}
                value={textField}
                onChange={(e) => setTextField(e.target.value)}
                rows={5}
              />
            </div>
          )}
        </div>
        {
          error && <p className="text-red-500 text-sm">{error}</p>
        }
        <Button
          onClick={async () => {
            if (title.trim() === "" || description.trim() === "") {
              setTimeout(() => setError(""), 2000)
              return setError("Title and Description cannot be empty")
            }
            if (contentType === "CrossWords" && wordsData.length < 2) {
              setTimeout(() => setError(""), 2000)
              return setError("Please add at least 2 words")
            }
            if (contentType === "DragTheWords" && textField.trim() === "") {
              setTimeout(() => setError(""), 2000)
              return setError("Text Field cannot be empty")
            }
            if (contentType === "CrossWords") {
              setLoading(true)
              const res = await fetch("/api/edit/words", {
                method: "POST",
                body: JSON.stringify({
                  title,
                  description,
                  wordsData,
                }),
              })
              const data = await res.json();
              const downloadUrl = data.uploadedFile?.[0]?.data?.ufsUrl
              const type = contentType
              setUploadedFiles([...uploadedFiles, { type, downloadUrl }])
              setLoading(false)
            } else if (contentType === "DragTheWords") {
              setLoading(true)
              const res = await fetch("/api/edit/dragAndDrop", {
                method: "POST",
                body: JSON.stringify({
                  title,
                  description,
                  textFieldsData: textField,
                }),
              })
              const data = await res.json()
              const downloadUrl = data.uploadedFile?.[0]?.data?.ufsUrl
              const type = contentType
              setUploadedFiles([...uploadedFiles, { type, downloadUrl }])
              setLoading(false)
            }
          }}
          disabled={loading}
          className="w-full cursor-pointer h-11 text-md transition-all"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Custom Content"
          )}
        </Button>
      </div>
    )
  }


  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-2xl shadow-lg border-muted">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            H5P Generator
          </CardTitle>
          <CardDescription className="text-lg">Create interactive H5P content in seconds</CardDescription>
        </CardHeader>
        <CardContent>
          {creationMode === "selection" && renderSelectionScreen()}
          {creationMode === "premade" && renderPremadeScreen()}
          {creationMode === "scratch" && renderScratchScreen()}

          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-medium">Generated Content</h3>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Your content is ready! <span className="font-bold">{file.type}</span>
                    </p>
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

