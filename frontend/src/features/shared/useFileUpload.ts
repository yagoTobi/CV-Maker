import { useState, useRef, useCallback } from 'react';

const VALID_EXTENSIONS = ['.pdf', '.docx', '.json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): string | null {
  const fileName = file.name.toLowerCase();
  const hasValidExtension = VALID_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return 'Unsupported file type. Please upload a PDF, DOCX, or JSON file.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. Maximum size is 10MB.';
  }

  return null;
}

export function useFileUpload(onValidFile: (file: File) => void, disabled?: boolean) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setLocalError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    onValidFile(file);
  }, [onValidFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = '';
  }, [handleFile]);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  return {
    isDragOver,
    localError,
    fileInputRef,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileInputChange,
    openFilePicker,
    clearError,
  };
}
