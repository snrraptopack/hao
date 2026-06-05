import type {} from 'auwla/jsx-runtime';

export function AccessibleMenuDemo() {
  const handleSelect = (action: string) => {
    console.log(`Selected action: ${action}`);
  };

  return () => (
    <div class="docs-section">
      <h1>Accessible Dropdown Menu</h1>
      <p>
        Navigate through the nested sub-menus and sub-sub-menus using hover or the <b>Tab</b> key. 
        The parent menus remain open and stable because of CSS <code>:focus-within</code> selectors.
      </p>

      <div class="interactive-demo" style={{ background: '#f8fafc', padding: '40px 24px', minHeight: '300px' }}>
        <ul class="menu-bar" role="menubar">
          <li class="menu-item-nested" role="none">
            <button class="menu-link" role="menuitem" onClick={() => handleSelect('home')}>
              Home
            </button>
          </li>

          <li class="menu-item-nested has-submenu" role="none">
            <button class="menu-link" role="menuitem" aria-haspopup="true">
              Services
            </button>
            
            <ul class="sub-menu" role="menu">
              <li class="menu-item-nested" role="none">
                <button class="menu-link" role="menuitem" onClick={() => handleSelect('design')}>
                  Web Design
                </button>
              </li>
              
              <li class="menu-item-nested has-submenu" role="none">
                <button class="menu-link" role="menuitem" aria-haspopup="true">
                  Development
                </button>
                
                <ul class="sub-menu" role="menu">
                  <li class="menu-item-nested" role="none">
                    <button class="menu-link" role="menuitem" onClick={() => handleSelect('frontend')}>
                      Frontend (Auwla)
                    </button>
                  </li>
                  <li class="menu-item-nested" role="none">
                    <button class="menu-link" role="menuitem" onClick={() => handleSelect('backend')}>
                      Backend (Bun)
                    </button>
                  </li>
                </ul>
              </li>

              <li class="menu-item-nested" role="none">
                <button class="menu-link" role="menuitem" onClick={() => handleSelect('marketing')}>
                  SEO Marketing
                </button>
              </li>
            </ul>
          </li>

          <li class="menu-item-nested" role="none">
            <button class="menu-link" role="menuitem" onClick={() => handleSelect('contact')}>
              Contact
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
