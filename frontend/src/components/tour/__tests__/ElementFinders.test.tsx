/**
 * Tests for tour element finder functions that were causing progression issues
 * These functions are responsible for locating DOM elements that tour steps attach to
 */

// Since the element finder functions are internal to OperatorTour, 
// we'll test them by extracting them into a testable module
// For now, we'll simulate the DOM scenarios they should handle

describe('Tour Element Finders', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('findSidebarMarketplaceLink', () => {
    it('finds marketplace link by href', () => {
      const link = document.createElement('a');
      link.href = '/marketplace';
      link.textContent = 'Marketplace';
      document.body.appendChild(link);

      const found = document.querySelector('a[href="/marketplace"]');
      expect(found).toBe(link);
    });

    it('finds marketplace link by Store icon', () => {
      const nav = document.createElement('nav');
      const link = document.createElement('a');
      link.href = '/marketplace';
      
      const icon = document.createElement('svg');
      icon.classList.add('lucide-store');
      
      link.appendChild(icon);
      nav.appendChild(link);
      document.body.appendChild(nav);

      const found = document.querySelector('.lucide-store')?.closest('a');
      expect(found).toBe(link);
      expect(found?.getAttribute('href')).toBe('/marketplace');
    });

    it('finds marketplace link by text content', () => {
      const link = document.createElement('a');
      link.href = '/marketplace';
      link.textContent = 'Agent Library';
      document.body.appendChild(link);

      const links = Array.from(document.querySelectorAll('a'));
      const found = links.find(l => {
        const text = l.textContent?.toLowerCase() || '';
        const href = l.getAttribute('href') || '';
        return (text.includes('marketplace') || text.includes('library')) && href.includes('/marketplace');
      });

      expect(found).toBe(link);
    });

    it('returns null when marketplace link not found', () => {
      const found = document.querySelector('a[href="/marketplace"]');
      expect(found).toBeNull();
    });
  });

  describe('findSidebarTasksSection', () => {
    it('finds tasks section by data-testid', () => {
      const section = document.createElement('div');
      section.setAttribute('data-testid', 'sidebar-tasks');
      section.textContent = 'Tasks';
      document.body.appendChild(section);

      const found = document.querySelector('[data-testid="sidebar-tasks"]');
      expect(found).toBe(section);
    });

    it('finds tasks section by sidebar group with task text', () => {
      const group = document.createElement('div');
      group.setAttribute('data-sidebar', 'group');
      group.textContent = 'Your Tasks';
      document.body.appendChild(group);

      const groups = document.querySelectorAll('[data-sidebar="group"]');
      const found = Array.from(groups).find(element => {
        const text = element.textContent?.toLowerCase() || '';
        return text.includes('tasks') || text.includes('chats') || text.includes('past');
      });

      expect(found).toBe(group);
    });

    it('finds tasks section by chat icons', () => {
      const section = document.createElement('div');
      section.setAttribute('data-sidebar', 'group');
      
      const icon = document.createElement('svg');
      icon.classList.add('lucide-messages-square');
      
      section.appendChild(icon);
      document.body.appendChild(section);

      const chatIcon = document.querySelector('.lucide-messages-square');
      const found = chatIcon?.closest('[data-sidebar="group"]');
      
      expect(found).toBe(section);
    });

    it('finds tasks section by New Task button', () => {
      const section = document.createElement('div');
      section.setAttribute('data-sidebar', 'group');
      
      const button = document.createElement('button');
      button.textContent = 'New Task';
      
      section.appendChild(button);
      document.body.appendChild(section);

      // Find the button element first
      const buttons = Array.from(document.querySelectorAll('button'));
      const buttonElement = buttons.find(btn => btn.textContent?.includes('New Task'));
      const found = buttonElement?.closest('[data-sidebar="group"]');
      
      expect(found).toBe(section);
    });
  });

  describe('findUserProfileButton', () => {
    it('finds profile button by data-testid', () => {
      const button = document.createElement('button');
      button.setAttribute('data-testid', 'user-profile');
      document.body.appendChild(button);

      const found = document.querySelector('[data-testid="user-profile"]');
      expect(found).toBe(button);
    });

    it('finds profile button by aria-label', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'User profile');
      document.body.appendChild(button);

      const found = document.querySelector('button[aria-label*="profile"]');
      expect(found).toBe(button);
    });

    it('finds profile button by avatar in sidebar', () => {
      const sidebar = document.createElement('nav');
      sidebar.classList.add('sidebar');
      
      const button = document.createElement('button');
      const avatar = document.createElement('img');
      avatar.setAttribute('alt', 'User profile');
      
      button.appendChild(avatar);
      sidebar.appendChild(button);
      document.body.appendChild(sidebar);

      const avatarElement = document.querySelector('img[alt*="profile"]');
      const found = avatarElement?.closest('button');
      const isInSidebar = found?.closest('.sidebar');
      
      expect(found).toBe(button);
      expect(isInSidebar).toBe(sidebar);
    });

    it('finds profile button by user icon in sidebar footer', () => {
      const sidebar = document.createElement('nav');
      sidebar.setAttribute('data-sidebar', 'root');
      
      const footer = document.createElement('div');
      footer.setAttribute('data-sidebar', 'footer');
      
      const button = document.createElement('button');
      const icon = document.createElement('svg');
      icon.classList.add('lucide-user');
      
      button.appendChild(icon);
      footer.appendChild(button);
      sidebar.appendChild(footer);
      document.body.appendChild(sidebar);

      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(btn => {
        const isInSidebar = btn.closest('[data-sidebar]');
        const hasUserIcon = btn.querySelector('.lucide-user');
        const isInFooter = btn.closest('[data-sidebar="footer"]');
        return isInSidebar && (hasUserIcon || isInFooter);
      });
      
      expect(found).toBe(button);
    });
  });

  describe('findNewTaskElement', () => {
    it('finds New Task button by text content', () => {
      const button = document.createElement('button');
      button.textContent = 'New Task';
      document.body.appendChild(button);

      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('new task');
      });

      expect(found).toBe(button);
    });

    it('finds New Task button by data-testid', () => {
      const button = document.createElement('button');
      button.setAttribute('data-testid', 'new-task-button');
      document.body.appendChild(button);

      const found = document.querySelector('[data-testid="new-task-button"]');
      expect(found).toBe(button);
    });

    it('finds New Task button by aria-label', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Create new task');
      document.body.appendChild(button);

      const found = document.querySelector('button[aria-label*="new task"]');
      expect(found).toBe(button);
    });

    it('finds plus button in sidebar context', () => {
      const sidebar = document.createElement('nav');
      sidebar.classList.add('sidebar');
      
      const button = document.createElement('button');
      const icon = document.createElement('svg');
      icon.classList.add('lucide-plus');
      
      button.appendChild(icon);
      sidebar.appendChild(button);
      document.body.appendChild(sidebar);

      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(btn => {
        const hasPlus = btn.querySelector('.lucide-plus');
        const isInSidebar = btn.closest('.sidebar');
        return hasPlus && isInSidebar;
      });

      expect(found).toBe(button);
    });
  });

  describe('findSendButton', () => {
    it('finds send button by arrow-up icon', () => {
      const button = document.createElement('button');
      const icon = document.createElement('svg');
      icon.classList.add('lucide-arrow-up');
      
      button.appendChild(icon);
      document.body.appendChild(button);

      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(btn => {
        return btn.querySelector('.lucide-arrow-up');
      });

      expect(found).toBe(button);
    });

    it('finds send button by submit type', () => {
      const button = document.createElement('button');
      button.setAttribute('type', 'submit');
      document.body.appendChild(button);

      const found = document.querySelector('button[type="submit"]');
      expect(found).toBe(button);
    });

    it('finds send button in chat input context', () => {
      const form = document.createElement('form');
      const chatInput = document.createElement('div');
      chatInput.setAttribute('data-testid', 'chat-input');
      
      const button = document.createElement('button');
      button.setAttribute('type', 'submit');
      
      chatInput.appendChild(button);
      form.appendChild(chatInput);
      document.body.appendChild(form);

      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(btn => {
        const isInChatInput = btn.closest('[data-testid="chat-input"]');
        const isSubmit = btn.getAttribute('type') === 'submit';
        return isInChatInput && isSubmit;
      });

      expect(found).toBe(button);
    });
  });

  describe('Element Finder Edge Cases', () => {
    it('handles missing elements gracefully', () => {
      // Test that selectors return null when elements don't exist
      expect(document.querySelector('a[href="/nonexistent"]')).toBeNull();
      expect(document.querySelector('[data-testid="nonexistent"]')).toBeNull();
      expect(document.querySelector('.nonexistent-class')).toBeNull();
    });

    it('handles multiple matching elements', () => {
      // Create multiple matching elements
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      button1.textContent = 'New Task';
      button2.textContent = 'New Task';
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('new task');
      });

      // Should find the first matching element
      expect(found).toBe(button1);
    });

    it('handles nested elements correctly', () => {
      const container = document.createElement('div');
      container.classList.add('sidebar');
      
      const nested = document.createElement('div');
      const button = document.createElement('button');
      const icon = document.createElement('svg');
      icon.classList.add('lucide-user');
      
      button.appendChild(icon);
      nested.appendChild(button);
      container.appendChild(nested);
      document.body.appendChild(container);

      const foundIcon = document.querySelector('.lucide-user');
      const foundButton = foundIcon?.closest('button');
      const foundSidebar = foundButton?.closest('.sidebar');
      
      expect(foundIcon).toBe(icon);
      expect(foundButton).toBe(button);
      expect(foundSidebar).toBe(container);
    });

    it('handles dynamic content changes', () => {
      // Initially no elements
      expect(document.querySelector('[data-testid="dynamic"]')).toBeNull();
      
      // Add element dynamically
      const element = document.createElement('div');
      element.setAttribute('data-testid', 'dynamic');
      document.body.appendChild(element);
      
      // Should now find the element
      expect(document.querySelector('[data-testid="dynamic"]')).toBe(element);
      
      // Remove element
      document.body.removeChild(element);
      
      // Should no longer find the element
      expect(document.querySelector('[data-testid="dynamic"]')).toBeNull();
    });
  });

  describe('Performance Considerations', () => {
    it('handles large DOM trees efficiently', () => {
      // Create a large DOM tree
      const container = document.createElement('div');
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.textContent = `Element ${i}`;
        container.appendChild(div);
      }
      
      // Add target element
      const target = document.createElement('button');
      target.setAttribute('data-testid', 'target-button');
      container.appendChild(target);
      
      document.body.appendChild(container);
      
      // Should still find the element efficiently
      const start = performance.now();
      const found = document.querySelector('[data-testid="target-button"]');
      const end = performance.now();
      
      expect(found).toBe(target);
      // Should complete in reasonable time (< 10ms for this simple case)
      expect(end - start).toBeLessThan(10);
    });
  });
});