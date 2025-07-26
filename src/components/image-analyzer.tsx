"use client";

import { useState, useCallback, useMemo, type DragEvent } from "react";
import Image from "next/image";
import {
  UploadCloud,
  Bot,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileImage,
  PlusSquare,
  User,
  Cpu,
} from "lucide-react";
import { analyzeImage, type AnalyzeImageOutput } from "@/ai/flows/analyze-image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AnalysisState = "idle" | "preview" | "loading" | "result";

interface AnalyzedImage {
  url: string;
  result: AnalyzeImageOutput;
}

export function ImageAnalyzer() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeImageOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const [realPhotos, setRealPhotos] = useState<AnalyzedImage[]>([]);
  const [aiPhotos, setAiPhotos] = useState<AnalyzedImage[]>([]);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (e.g., PNG, JPG, GIF).",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      setResult(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    },
    [toast]
  );

  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
      const base64data = reader.result as string;
      try {
        const analysisResult = await analyzeImage({ photoDataUri: base64data });
        setResult(analysisResult);
      } catch (e) {
        console.error(e);
        toast({
          title: "Analysis Failed",
          description:
            "There was an error analyzing your image. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Could not read the selected image file.",
        variant: "destructive",
      });
      setIsLoading(false);
    };
  }, [imageFile, toast]);

  const handleReset = useCallback(() => {
    // We don't revoke the object URL here because it might have been added to the dataset
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setIsLoading(false);
  }, []);

  const handleAddToDataset = useCallback(() => {
    if (!previewUrl || !result) return;
    const newImage: AnalyzedImage = { url: previewUrl, result };
    if (result.isAiGenerated) {
      setAiPhotos((prev) => [newImage, ...prev]);
    } else {
      setRealPhotos((prev) => [newImage, ...prev]);
    }
    handleReset();
    toast({
      title: "Image Added",
      description: "The image has been added to your dataset.",
    });
  }, [previewUrl, result, handleReset, toast]);


  const state: AnalysisState = useMemo(() => {
    if (isLoading) return "loading";
    if (result) return "result";
    if (previewUrl) return "preview";
    return "idle";
  }, [isLoading, result, previewUrl]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8">
      <Card className="w-full shadow-lg rounded-xl overflow-hidden transition-all duration-300">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-headline tracking-tight">
                AI Image Detector
              </CardTitle>
              <CardDescription>
                Is your image authentic or AI-generated?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-8">
          {state === "idle" && (
            <Dropzone
              onFileSelect={handleFile}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
          )}
          {(state === "preview" || state === "loading" || state === "result") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-4">
                <div className="relative w-full aspect-1 bg-muted rounded-lg overflow-hidden border-2 border-dashed">
                  {previewUrl && (
                    <Image
                      src={previewUrl}
                      alt="Image preview"
                      fill
                      className="object-contain"
                      data-ai-hint="abstract painting"
                    />
                  )}
                </div>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Analyze Another Image
                </Button>
              </div>
              <div className="flex flex-col justify-center min-h-[300px]">
                {state === "loading" && <AnalysisSkeleton />}
                {state === "result" && result && (
                  <AnalysisResultDisplay
                    result={result}
                    onAddToDataset={handleAddToDataset}
                  />
                )}
                {state === "preview" && (
                  <AnalysisPrompt onAnalyze={handleAnalyze} />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ImageGallery title="Your Real Photos" icon={User} images={realPhotos} />
        <ImageGallery title="Your AI-Generated Photos" icon={Cpu} images={aiPhotos} />
      </div>
    </div>
  );
}

function Dropzone({ onFileSelect, isDragging, setIsDragging }: { onFileSelect: (file: File) => void; isDragging: boolean; setIsDragging: (isDragging: boolean) => void; }) {
  const handleDrag = (e: DragEvent<HTMLDivElement>, enter: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(enter);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDrag(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary/80 transition-colors",
        isDragging && "bg-primary/10 border-primary"
      )}
      onDragEnter={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept="image/*"
        onChange={(e) => onFileSelect(e.target.files?.[0] as File)}
      />
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
      >
        <UploadCloud
          className={cn(
            "w-12 h-12 text-muted-foreground mb-4 transition-transform",
            isDragging && "scale-110 text-primary"
          )}
        />
        <p className="mb-2 text-lg font-semibold">
          <span className="text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, GIF, WEBP, etc.
        </p>
      </label>
    </div>
  );
}

function AnalysisPrompt({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 bg-secondary/30 rounded-lg text-center">
      <FileImage className="w-16 h-16 text-muted-foreground" />
      <h3 className="text-xl font-semibold">Image Ready for Analysis</h3>
      <p className="text-sm text-muted-foreground">
        Click the button below to let our AI determine if this image is
        authentic or AI-generated.
      </p>
      <Button onClick={onAnalyze} size="lg">
        <Bot className="mr-2 h-5 w-5" />
        Analyze Image
      </Button>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function AnalysisResultDisplay({ result, onAddToDataset }: { result: AnalyzeImageOutput; onAddToDataset: () => void; }) {
  const confidencePercent = Math.round(result.confidenceScore * 100);
  const verdict = result.isAiGenerated
    ? "Likely AI-Generated"
    : "Likely Authentic";
  const VerdictIcon = result.isAiGenerated ? XCircle : CheckCircle2;

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex items-center gap-3 p-4 rounded-lg",
          result.isAiGenerated ? "bg-destructive/10" : "bg-green-500/10"
        )}
      >
        <VerdictIcon
          className={cn(
            "h-10 w-10",
            result.isAiGenerated ? "text-destructive" : "text-green-600 dark:text-green-500"
          )}
        />
        <h3 className="text-2xl font-bold tracking-tight">{verdict}</h3>
      </div>

      <div className="space-y-2">
        <LabelWithPercent
          htmlFor="confidence"
          label="Confidence Score"
          percent={confidencePercent}
        />
        <Progress
          id="confidence"
          value={confidencePercent}
          className="h-3 [&>div]:bg-accent"
        />
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold">Rationale</h4>
        <p className="text-sm text-muted-foreground bg-secondary/30 p-4 rounded-md border">
          {result.rationale}
        </p>
      </div>
      <Button onClick={onAddToDataset} className="w-full">
        <PlusSquare className="mr-2 h-4 w-4" />
        Add to Dataset
      </Button>
    </div>
  );
}

function LabelWithPercent({
  htmlFor,
  label,
  percent,
}: {
  htmlFor: string;
  label: string;
  percent: number;
}) {
  return (
    <div className="flex justify-between items-center">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      <span className="text-sm font-mono font-medium text-accent">
        {percent}%
      </span>
    </div>
  );
}

function ImageGallery({ title, icon: Icon, images }: { title: string; icon: React.ElementType; images: AnalyzedImage[]; }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-muted-foreground" />
          <CardTitle className="text-xl">{title}</CardTitle>
          <span className="text-sm font-mono px-2 py-1 bg-muted rounded-md">{images.length}</span>
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg bg-secondary/30">
            <p className="text-muted-foreground">No images yet.</p>
            <p className="text-sm text-muted-foreground">Analyze an image to add it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                <Image
                  src={image.url}
                  alt={`Dataset image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}