import { z } from "zod";

// Login form schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Signup form schema
export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

// File upload validation
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
];
export const ACCEPTED_FILE_EXTENSIONS = [".pdf", ".docx", ".doc"];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds the 50MB limit`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_FILE_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "Only PDF and Word documents (.pdf, .docx, .doc) are allowed",
    };
  }

  // Check MIME type (with fallback for edge cases)
  const isValidMimeType = ACCEPTED_FILE_TYPES.includes(file.type);
  // Some browsers may not set MIME type correctly, so we allow if extension is valid
  if (!isValidMimeType && file.type !== "") {
    return {
      valid: false,
      error: "Invalid file type. Please upload a PDF or Word document",
    };
  }

  return { valid: true };
}
