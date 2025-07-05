"use client"
import type React from "react"
import { useEffect, useRef } from "react"
import { Renderer, Program, Mesh, Triangle } from "ogl"
import { useSidebar } from "@/components/ui/sidebar"
import { useTheme } from "next-themes"

// Vertex Shader
const vert = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`

// Fragment Shader
const frag = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uIsDarkMode;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  float d = -uTime * 1.2;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
      a += cos(i - d - a * uv.x);
      d += sin(uv.y * i + a);
  }
  d += uTime * 1.0;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5);
  
  float gray = dot(col, vec3(0.299, 0.587, 0.114));
  
  vec3 finalColor;
  if (uIsDarkMode > 0.5) {
      // Dark mode: dark background with higher contrast light patterns
      float darkPattern = 0.1 + (gray * 0.4); // Dark base with more visible light patterns
      finalColor = vec3(darkPattern);
  } else {
      // Light mode: light background with darker patterns
      float lightPattern = 0.7 + (gray * 0.3); // Light background with visible dark patterns
      finalColor = vec3(lightPattern);
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`

type NovatrixProps = {}

export const Novatrix: React.FC<NovatrixProps> = () => {
  const ctnDom = useRef<HTMLDivElement>(null)
  const { state, open } = useSidebar()
  const { theme, resolvedTheme } = useTheme()
  const observerRef = useRef<MutationObserver | null>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<any>(null)

  useEffect(() => {
    if (!ctnDom.current) {
      return
    }

    const ctn = ctnDom.current
    const renderer = new Renderer()
    const gl = renderer.gl
    glRef.current = gl
    
    // Set initial clear color based on app theme
    const isDarkMode = resolvedTheme === 'dark'
    gl.clearColor(isDarkMode ? 0 : 1, isDarkMode ? 0 : 1, isDarkMode ? 0 : 1, 1)

    const geometry = new Triangle(gl)

    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        uTime: { value: 0 },
        uIsDarkMode: { value: resolvedTheme === 'dark' ? 1.0 : 0.0 },
        uResolution: {
          value: [ctn.offsetWidth, ctn.offsetHeight, ctn.offsetWidth / ctn.offsetHeight],
        },
      },
    })
    programRef.current = program

    const mesh = new Mesh(gl, { geometry, program })

    function resize() {
      const scale = 1
      renderer.setSize(ctn.offsetWidth * scale, ctn.offsetHeight * scale)
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]
    }

    // Enhanced resize handler with delay for layout updates
    const handleResize = () => {
      // Small delay to ensure layout has updated
      setTimeout(() => {
        resize()
      }, 100);
    };

    window.addEventListener("resize", handleResize, false)
    resize()

    // Create mutation observer to monitor sidebar changes
    observerRef.current = new MutationObserver((mutations) => {
      let shouldResize = false;
      
      mutations.forEach((mutation) => {
        // Check for sidebar-related changes
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element;
          
          // Monitor data-state changes on sidebar elements
          if (mutation.attributeName === 'data-state' && 
              target.matches('[data-slot="sidebar"]')) {
            shouldResize = true;
          }
          
          // Monitor class changes that might affect layout
          if (mutation.attributeName === 'class') {
            const classList = target.classList;
            // Check for sidebar-related class changes
            if (Array.from(classList).some(className => 
                className.includes('sidebar') || 
                className.includes('collapsed') || 
                className.includes('expanded'))) {
              shouldResize = true;
            }
          }
          
          // Monitor style changes that might affect layout
          if (mutation.attributeName === 'style') {
            shouldResize = true;
          }
        }
      });
      
      if (shouldResize) {
        handleResize();
      }
    });
    
    if (observerRef.current) {
      // Observe the entire document for sidebar changes
      observerRef.current.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-state', 'data-collapsible'],
        subtree: true
      });
    }

    // Additional listener for CSS transitions end
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'width' || event.propertyName === 'left' || event.propertyName === 'right') {
        handleResize();
      }
    };
    
    document.addEventListener('transitionend', handleTransitionEnd);

    const updateTheme = () => {
      const isDark = resolvedTheme === 'dark'
      program.uniforms.uIsDarkMode.value = isDark ? 1.0 : 0.0
      // Update canvas clear color based on theme
      gl.clearColor(isDark ? 0 : 1, isDark ? 0 : 1, isDark ? 0 : 1, 1)
    }

    updateTheme()

    let animateId: number

    function update(t: number) {
      animateId = requestAnimationFrame(update)
      program.uniforms.uTime.value = t * 0.001
      renderer.render({ scene: mesh })
    }
    animateId = requestAnimationFrame(update)

    ctn.appendChild(gl.canvas)

    return () => {
      cancelAnimationFrame(animateId)
      window.removeEventListener("resize", handleResize)
      document.removeEventListener('transitionend', handleTransitionEnd)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (ctn.contains(gl.canvas)) {
        ctn.removeChild(gl.canvas)
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])

  // Effect to handle theme changes
  useEffect(() => {
    if (glRef.current && programRef.current) {
      const isDark = resolvedTheme === 'dark'
      programRef.current.uniforms.uIsDarkMode.value = isDark ? 1.0 : 0.0
      glRef.current.clearColor(isDark ? 0 : 1, isDark ? 0 : 1, isDark ? 0 : 1, 1)
    }
  }, [resolvedTheme])

  // Effect to handle sidebar state changes
  useEffect(() => {
    const ctn = ctnDom.current
    if (ctn) {
      // Delay to ensure CSS transitions have time to complete
      const timer = setTimeout(() => {
        const scale = 1
        // Trigger resize to adjust canvas to new dimensions
        const rect = ctn.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          // Find the canvas and resize it
          const canvas = ctn.querySelector('canvas')
          if (canvas) {
            canvas.width = rect.width * scale
            canvas.height = rect.height * scale
            canvas.style.width = rect.width + 'px'
            canvas.style.height = rect.height + 'px'
          }
        }
      }, 300); // Slightly longer delay for transitions
      
      return () => clearTimeout(timer);
    }
  }, [state, open]);

  return <div ref={ctnDom} className="gradient-canvas h-full w-full"></div>
}

const Background = () => {
  return (
    <div className="h-screen w-screen">
      <Novatrix />
    </div>
  )
}

export default Background
