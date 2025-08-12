/**
 * Constructs a preview URL for HTML files in the sandbox environment.
 * When project ID is available, creates a smart URL with auto-restart functionality.
 * Otherwise falls back to direct sandbox URL.
 *
 * @param sandboxUrl - The base URL of the sandbox
 * @param filePath - The path to the HTML file (can include /workspace/ prefix)
 * @param projectId - Optional project ID for smart URL generation
 * @returns The properly encoded preview URL, or undefined if inputs are invalid
 */
export function constructHtmlPreviewUrl(
  sandboxUrl: string | undefined,
  filePath: string | undefined,
  projectId?: string | undefined,
): string | undefined {
  if (!sandboxUrl || !filePath) {
    return undefined;
  }

  // Remove /workspace/ prefix if present
  const processedPath = filePath.replace(/^\/workspace\//, '');

  // If project ID is available, generate smart URL with auto-restart functionality
  if (projectId) {
    const frontendUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    
    // Split the path into segments and encode each segment individually
    const pathSegments = processedPath
      .split('/')
      .map((segment) => encodeURIComponent(segment));

    // Join the segments back together with forward slashes
    const encodedPath = pathSegments.join('/');

    return `${frontendUrl}/sandbox/${projectId}/${encodedPath}`;
  }

  // Fallback to direct sandbox URL (legacy behavior)
  // Split the path into segments and encode each segment individually
  const pathSegments = processedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment));

  // Join the segments back together with forward slashes
  const encodedPath = pathSegments.join('/');

  return `${sandboxUrl}/${encodedPath}`;
}
