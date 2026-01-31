"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, X, Loader2, Camera, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ScannedSubject } from "./ResultsDialog";
import Image from "next/image";
import Tesseract from "tesseract.js";

interface ScanUploaderProps {
  onScanComplete: (data: ScannedSubject[]) => void;
}

export default function ScanUploader({ onScanComplete }: ScanUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;
    
    // Limit to 10 images
    if (selectedFiles.length > 10) {
      toast.error("Maximum 10 images allowed at once");
      return;
    }

    // Revoke existing previews before creating new ones
    previews.forEach(url => {
      URL.revokeObjectURL(url);
    });

    setFiles(selectedFiles);
    const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  useEffect(() => {
    return () => {
      previews.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  const clearFiles = () => {
    previews.forEach(url => {
      URL.revokeObjectURL(url);
    });
    setFiles([]);
    setPreviews([]);
    setCurrentIndex(0);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setLoading(true);
    const allSubjects: ScannedSubject[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setCurrentIndex(i);
        setProgress(0);
        setStatusMessage(`Creating worker for image ${i + 1}...`);

        try {
          // 1. Run OCR Client-Side
          setStatusMessage(`Scanning image ${i + 1} (this may take a moment)...`);
          
          const { data: { text } } = await Tesseract.recognize(
            files[i],
            'eng',
            {
              logger: m => {
                if (m.status === 'recognizing text') {
                  setProgress(m.progress * 100);
                }
              }
            }
          );

          if (process.env.NODE_ENV !== "production") {
            console.log(`OCR Output for Image ${i + 1}:`, text);
          }
          setStatusMessage(`Parsing data for image ${i + 1}...`);

          // 2. Send Text to Server for Parsing
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
          });

          const data = await res.json();

          if (!res.ok) {
            console.error("Parse error:", data.error);
            // Don't throw, just log. We might have gotten partial data or bad image.
            toast.error(`Could not extract data from image ${i + 1}`);
            continue; 
          }

          if (data.data && Array.isArray(data.data)) {
            // Merge new subjects with existing ones
            const newSubjects = data.data as ScannedSubject[];
            
            newSubjects.forEach(newSub => {
              const existingIndex = allSubjects.findIndex(
                s => s.name.toLowerCase() === newSub.name.toLowerCase() || 
                     (s.code && newSub.code && s.code === newSub.code)
              );

              if (existingIndex >= 0) {
                // Merge logic: keep the one with better data (e.g. more hours)
                const existing = allSubjects[existingIndex];
                if (newSub.total_hours > existing.total_hours) {
                  allSubjects[existingIndex] = newSub;
                }
                // If counts are equal, prefer the one with a code
                else if (newSub.total_hours === existing.total_hours && !existing.code && newSub.code) {
                   allSubjects[existingIndex] = newSub;
                }
              } else {
                allSubjects.push(newSub);
              }
            });

            toast.success(`Processed image ${i + 1}: Found ${newSubjects.length} subjects`);
          } else {
            toast.warning(`No subjects found in image ${i + 1}`);
          }

        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
          toast.error(`Failed to process image ${i + 1}`);
        }
      }

      if (allSubjects.length === 0) {
        toast.error("No attendance data found", {
          description: "Please upload a clear screenshot of your attendance table from your college portal.",
          duration: 5000,
        });
        setLoading(false);
        setCurrentIndex(0);
        setProgress(0);
        setStatusMessage("");
        return;
      }

      toast.success(`Successfully extracted ${allSubjects.length} total subjects!`);
      onScanComplete(allSubjects);
      clearFiles();

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Process failed";
      toast.error("Failed to process images", {
        description: message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setCurrentIndex(0);
      setProgress(0);
      setStatusMessage("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {files.length === 0 ? (
        <Card
          className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer bg-muted/5"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <UploadCloud className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">
              Upload Attendance Screenshots
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Take a screenshot of your attendance table from your college portal and upload it here
            </p>
            <div className="space-y-2 w-full max-w-md">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Camera className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-blue-900 text-left">
                  ✅ Works with any college portal
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="font-medium text-green-900 text-left">
                  💡 Make sure the attendance table is clearly visible
                </span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Preview Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-display font-bold">
                {files.length} image{files.length > 1 ? 's' : ''} selected
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFiles}
                disabled={loading}
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-muted">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {loading && index < currentIndex && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                    )}
                    {loading && index === currentIndex && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  {!loading && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <p className="text-xs text-center mt-1 text-muted-foreground">
                    Image {index + 1}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {statusMessage || `Processing image ${currentIndex + 1}...`}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                ⏳ Reading text from image...
              </p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={loading || files.length === 0}
              className="flex-1 font-display font-bold"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Scan {files.length} Image{files.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
