import { WORDLIST } from './wordlist.js';

// DOM Ready Handler
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCryptoPipeline();
  initPasswordGenerator();
  initCodeViewer();
  initFaqAccordions();
  initScrollspy();
  initSearch();
  initMobileDrawer();
});

// ============================================================================
// 1. Theme Management (Dark / Light)
// ============================================================================
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('kobean-theme') || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('kobean-theme', newTheme);
      updateThemeIcon(newTheme);
      showToast(`Theme switched to ${newTheme} mode`);
    });
  }
}

function updateThemeIcon(theme) {
  const iconSpan = document.getElementById('theme-icon');
  if (!iconSpan) return;
  if (theme === 'light') {
    iconSpan.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  } else {
    iconSpan.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  }
}

// ============================================================================
// 2. Interactive Cryptographic Pipeline Visualizer
// ============================================================================
const PIPELINE_DETAILS = {
  1: {
    title: "1. Master Password Input & 32-byte CSPRNG Salt",
    text: "When you enter your Master Password to unlock or initialize your vault, KobeanPass loads a unique 32-byte cryptographically secure random salt (`OsRng`). The master password is held in temporary zeroizable memory (`zeroize::ZeroizeOnDrop`) and never leaves your local CPU.",
    specs: ["Salt Length: 32 bytes (256-bit)", "RNG: OS Hardware CSPRNG", "Memory: Zeroize + ZeroizeOnDrop"]
  },
  2: {
    title: "2. Memory-Hard Key Derivation (Argon2id)",
    text: "The master password and salt are hashed through Argon2id (Version 0x13). Parameters: 64 MiB RAM, 3 iterations, 4 parallel execution lanes. This memory-hard configuration makes FPGA and GPU brute-force attacks economically and physically infeasible.",
    specs: ["Algorithm: Argon2id v0x13", "Memory Cost: 65,536 KiB (64 MiB)", "Iterations: 3 passes", "Parallelism: 4 threads", "Output: 32-byte Master Key (MK)"]
  },
  3: {
    title: "3. HKDF-SHA256 Key Expansion",
    text: "The Master Key is expanded using HKDF-SHA256 with distinct domain separation strings. We derive: (1) `KeyWrappingKey (KWK)` with info 'kobean-kwrap' to decrypt the vault key, and (2) `AuthKey` with info 'kobean-auth' for instant authentication verification.",
    specs: ["Hash Function: SHA-256", "Info Strings: 'kobean-kwrap', 'kobean-auth'", "Domain Separation: Prevents key reuse"]
  },
  4: {
    title: "4. Vault Encryption Key (VEK) Unwrapping",
    text: "A 256-bit Vault Encryption Key (VEK) is generated at vault creation. The VEK is stored encrypted by the KWK using XChaCha20-Poly1305 with a 24-byte CSPRNG nonce. When the user changes their master password, only the VEK envelope is re-encrypted—never every item!",
    specs: ["VEK Entropy: 256 bits CSPRNG", "Envelope Cipher: XChaCha20-Poly1305", "Nonce: 192-bit CSPRNG Nonce"]
  },
  5: {
    title: "5. Per-Record AEAD Encryption (XChaCha20-Poly1305)",
    text: "Every item (passwords, notes, TOTP secrets) is serialized into an inner JSON payload and encrypted with the VEK using XChaCha20-Poly1305. We bind Additional Authenticated Data (AAD) containing `vault_id + record_id + schema_version` to prevent ciphertext transplant attacks.",
    specs: ["AEAD: XChaCha20-Poly1305", "AAD: vault_id || item_id || schema_version", "Tag: 128-bit Poly1305 MAC"]
  },
  6: {
    title: "6. Double-Layer Storage: SQLCipher (AES-256-CBC)",
    text: "The encrypted record envelopes and metadata are stored in a local SQLite database compiled with SQLCipher. Every 4096-byte database page is encrypted with AES-256-CBC and authenticated with HMAC-SHA512. Even raw file access reveals zero plaintext or structure.",
    specs: ["Cipher: AES-256-CBC", "Page Size: 4096 bytes", "Page MAC: HMAC-SHA512", "Key Derivation: PBKDF2-HMAC-SHA512 (256,000 iter)"]
  }
};

function initCryptoPipeline() {
  const nodes = document.querySelectorAll('.pipeline-step-node');
  const detailTitle = document.getElementById('pipeline-detail-title');
  const detailText = document.getElementById('pipeline-detail-text');
  const detailSpecs = document.getElementById('pipeline-detail-specs');

  if (!nodes.length) return;

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      const step = node.getAttribute('data-step');
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      const data = PIPELINE_DETAILS[step];
      if (data && detailTitle && detailText && detailSpecs) {
        detailTitle.textContent = data.title;
        detailText.textContent = data.text;
        detailSpecs.innerHTML = data.specs
          .map(spec => `<span class="node-badge" style="display:inline-block; margin: 4px 6px 4px 0;">${spec}</span>`)
          .join('');
      }
    });
  });
}

// ============================================================================
// 3. Live Interactive Password & Passphrase Generator Playground
// ============================================================================
let generatorMode = 'password'; // 'password' | 'passphrase' | 'pin'

function initPasswordGenerator() {
  const lengthSlider = document.getElementById('gen-length-slider');
  const lengthVal = document.getElementById('gen-length-val');
  const upperToggle = document.getElementById('gen-opt-upper');
  const lowerToggle = document.getElementById('gen-opt-lower');
  const numToggle = document.getElementById('gen-opt-num');
  const symToggle = document.getElementById('gen-opt-sym');
  const noAmbiguousToggle = document.getElementById('gen-opt-ambiguous');
  const refreshBtn = document.getElementById('gen-refresh-btn');
  const copyBtn = document.getElementById('gen-copy-btn');
  const outputText = document.getElementById('gen-output-text');
  const entropyFill = document.getElementById('gen-entropy-fill');
  const entropyScore = document.getElementById('gen-entropy-score');
  const crackTime = document.getElementById('gen-crack-time');
  const modeBtns = document.querySelectorAll('.mode-tab-btn');

  function generate() {
    let result = '';
    let poolSize = 0;
    const length = parseInt(lengthSlider.value, 10);

    if (generatorMode === 'password') {
      let chars = '';
      if (lowerToggle.checked) {
        chars += noAmbiguousToggle.checked ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
        poolSize += 26;
      }
      if (upperToggle.checked) {
        chars += noAmbiguousToggle.checked ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        poolSize += 26;
      }
      if (numToggle.checked) {
        chars += noAmbiguousToggle.checked ? '23456789' : '0123456789';
        poolSize += 10;
      }
      if (symToggle.checked) {
        chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        poolSize += 28;
      }

      if (chars.length === 0) {
        chars = 'abcdefghijklmnopqrstuvwxyz';
        poolSize = 26;
      }

      const randomBytes = new Uint32Array(length);
      window.crypto.getRandomValues(randomBytes);
      for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % chars.length];
      }
    } else if (generatorMode === 'passphrase') {
      const wordCount = Math.min(Math.max(Math.round(length / 4), 3), 10);
      const words = [];
      const randomWords = new Uint32Array(wordCount);
      window.crypto.getRandomValues(randomWords);
      
      for (let i = 0; i < wordCount; i++) {
        words.push(WORDLIST[randomWords[i] % WORDLIST.length]);
      }
      result = words.join('-');
      poolSize = WORDLIST.length;
    } else if (generatorMode === 'pin') {
      const pinLength = Math.min(Math.max(length, 4), 16);
      const digits = new Uint32Array(pinLength);
      window.crypto.getRandomValues(digits);
      for (let i = 0; i < pinLength; i++) {
        result += (digits[i] % 10).toString();
      }
      poolSize = 10;
    }

    outputText.textContent = result;
    calculateEntropy(result, poolSize, generatorMode, entropyFill, entropyScore, crackTime);
  }

  function calculateEntropy(val, poolSize, mode, fillEl, scoreEl, crackEl) {
    let entropy = 0;
    if (mode === 'password') {
      entropy = val.length * Math.log2(poolSize || 2);
    } else if (mode === 'passphrase') {
      const count = val.split('-').length;
      entropy = count * Math.log2(WORDLIST.length);
    } else if (mode === 'pin') {
      entropy = val.length * Math.log2(10);
    }

    entropy = Math.round(entropy);
    scoreEl.textContent = `${entropy} bits`;

    // Percentage of 128-bit ideal bar
    const percentage = Math.min(Math.round((entropy / 128) * 100), 100);
    fillEl.style.width = `${percentage}%`;

    // Estimate crack time at 10^10 guesses/sec
    let estimate = "";
    if (entropy < 30) {
      estimate = "Instant (< 1 sec)";
      fillEl.style.background = "#f43f5e";
    } else if (entropy < 50) {
      estimate = "A few minutes";
      fillEl.style.background = "#f59e0b";
    } else if (entropy < 70) {
      estimate = "~3 centuries";
      fillEl.style.background = "#10b981";
    } else if (entropy < 90) {
      estimate = "~2 million years";
      fillEl.style.background = "#06b6d4";
    } else {
      estimate = "Centuries (> 100M years - Military Grade)";
      fillEl.style.background = "linear-gradient(90deg, #10b981, #6366f1)";
    }
    crackEl.textContent = estimate;
  }

  if (lengthSlider && lengthVal) {
    lengthSlider.addEventListener('input', () => {
      lengthVal.textContent = lengthSlider.value;
      generate();
    });
  }

  [upperToggle, lowerToggle, numToggle, symToggle, noAmbiguousToggle].forEach(toggle => {
    if (toggle) toggle.addEventListener('change', generate);
  });

  if (refreshBtn) refreshBtn.addEventListener('click', generate);

  if (copyBtn && outputText) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(outputText.textContent).then(() => {
        showToast('Password copied to clipboard!');
      });
    });
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      generatorMode = btn.getAttribute('data-mode');

      // Adjust slider constraints
      if (generatorMode === 'passphrase') {
        lengthSlider.min = 12;
        lengthSlider.max = 36;
        lengthSlider.value = 20;
        lengthVal.textContent = "20 (5 words)";
      } else if (generatorMode === 'pin') {
        lengthSlider.min = 4;
        lengthSlider.max = 16;
        lengthSlider.value = 6;
        lengthVal.textContent = "6";
      } else {
        lengthSlider.min = 8;
        lengthSlider.max = 64;
        lengthSlider.value = 20;
        lengthVal.textContent = "20";
      }

      generate();
    });
  });

  // Initial trigger
  generate();
}

// ============================================================================
// 4. Code Snippet Viewer & Copy
// ============================================================================
const CODE_SNIPPETS = {
  rust: `<span class="token-comment">// src-tauri/src/core/crypto.rs</span>
<span class="token-keyword">pub fn</span> <span class="token-fn">derive_master_key</span>(
    password: &amp;[<span class="token-type">u8</span>],
    salt: &amp;[<span class="token-type">u8</span>; <span class="token-type">32</span>],
    params: &amp;<span class="token-type">KdfParams</span>,
) -&gt; <span class="token-type">Result</span>&lt;<span class="token-type">MasterKey</span>, <span class="token-type">KobeanError</span>&gt; {
    <span class="token-keyword">let</span> argon2_params = <span class="token-type">Params</span>::<span class="token-fn">new</span>(
        params.memory_kib, <span class="token-comment">// 64 MiB</span>
        params.iterations, <span class="token-comment">// 3 passes</span>
        params.parallelism, <span class="token-comment">// 4 threads</span>
        <span class="token-type">Some</span>(<span class="token-type">32</span>),
    ).<span class="token-fn">map_err</span>(|e| <span class="token-type">KobeanError</span>::<span class="token-fn">KeyDerivation</span>(e.<span class="token-fn">to_string</span>()))?;

    <span class="token-keyword">let</span> argon2 = <span class="token-type">Argon2</span>::<span class="token-fn">new</span>(<span class="token-type">Algorithm</span>::<span class="token-type">Argon2id</span>, <span class="token-type">Version</span>::<span class="token-type">V0x13</span>, argon2_params);
    <span class="token-keyword">let mut</span> key_bytes = [<span class="token-type">0u8</span>; <span class="token-type">32</span>];
    argon2.<span class="token-fn">hash_password_into</span>(password, salt, &amp;<span class="token-keyword">mut</span> key_bytes)?;

    <span class="token-type">Ok</span>(<span class="token-type">MasterKey</span>(key_bytes)) <span class="token-comment">// Implements Zeroize + ZeroizeOnDrop</span>
}`,
  tauri: `<span class="token-comment">// src-tauri/src/commands/vault_commands.rs</span>
<span class="token-keyword">#[tauri::command]</span>
<span class="token-keyword">pub async fn</span> <span class="token-fn">unlock_vault</span>(
    password: <span class="token-type">String</span>,
    state: <span class="token-type">State</span>&lt;<span class="token-type">'_, AppState</span>&gt;,
) -&gt; <span class="token-type">Result</span>&lt;<span class="token-type">VaultStatus</span>, <span class="token-type">String</span>&gt; {
    <span class="token-comment">// Rate-limiting check with exponential backoff</span>
    <span class="token-keyword">let mut</span> vault_lock = state.vault.<span class="token-fn">lock</span>().<span class="token-fn">await</span>;
    <span class="token-keyword">let</span> status = vault_lock.<span class="token-fn">unlock</span>(password.<span class="token-fn">as_bytes</span>())
        .<span class="token-fn">map_err</span>(|e| e.<span class="token-fn">to_string</span>())?;

    <span class="token-type">Ok</span>(status) <span class="token-comment">// Returns typed status, never exposes raw keys</span>
}`,
  typescript: `<span class="token-comment">// src/lib/tauri.ts - Type-Safe IPC Bridge</span>
<span class="token-keyword">import</span> { invoke } <span class="token-keyword">from</span> <span class="token-string">'@tauri-apps/api/core'</span>;

<span class="token-keyword">export interface</span> <span class="token-type">VaultItem</span> {
  id: <span class="token-type">string</span>;
  title: <span class="token-type">string</span>;
  username: <span class="token-type">string</span>;
  website_url?: <span class="token-type">string</span>;
  folder_id?: <span class="token-type">string</span>;
  favorite: <span class="token-type">boolean</span>;
  updated_at: <span class="token-type">number</span>;
}

<span class="token-keyword">export async function</span> <span class="token-fn">getVaultItems</span>(): <span class="token-type">Promise</span>&lt;<span class="token-type">VaultItem</span>[]&gt; {
  <span class="token-keyword">return await</span> <span class="token-fn">invoke</span>&lt;<span class="token-type">VaultItem</span>[]&gt;(<span class="token-string">'list_vault_items'</span>);
}`,
  cli: `<span class="token-comment"># Clone and build KobeanPass locally</span>
<span class="token-keyword">git clone</span> <span class="token-string">https://github.com/thienng-it/KobeanPass.git</span>
<span class="token-keyword">cd</span> KobeanPass

<span class="token-comment"># Install dependencies</span>
<span class="token-keyword">pnpm</span> install

<span class="token-comment"># Run development desktop client (Tauri v2 + React 19)</span>
<span class="token-keyword">pnpm</span> tauri dev

<span class="token-comment"># Run test suite</span>
<span class="token-keyword">pnpm</span> test
<span class="token-keyword">cd</span> src-tauri &amp;&amp; <span class="token-keyword">cargo</span> test`
};

function initCodeViewer() {
  const tabs = document.querySelectorAll('.code-tab-btn');
  const codeBlock = document.getElementById('code-content-block');
  const copyBtn = document.getElementById('copy-code-snippet-btn');

  if (!tabs.length || !codeBlock) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const lang = tab.getAttribute('data-lang');
      if (CODE_SNIPPETS[lang]) {
        codeBlock.innerHTML = CODE_SNIPPETS[lang];
      }
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = codeBlock.innerText;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Code snippet copied!');
      });
    });
  }

  // Set initial content
  codeBlock.innerHTML = CODE_SNIPPETS.rust;
}

// ============================================================================
// 5. FAQ Accordions
// ============================================================================
function initFaqAccordions() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

// ============================================================================
// 6. Scrollspy Table of Contents
// ============================================================================
function initScrollspy() {
  const links = document.querySelectorAll('.sidebar-link');
  const sections = document.querySelectorAll('.doc-section');

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      if (section.offsetTop <= scrollPos) {
        currentId = section.getAttribute('id');
      }
    });

    links.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  });
}

// ============================================================================
// 7. Live Documentation Search
// ============================================================================
function initSearch() {
  const searchInput = document.getElementById('nav-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const sections = document.querySelectorAll('.doc-section');

    if (query === '') {
      sections.forEach(s => s.style.display = 'block');
      return;
    }

    sections.forEach(sec => {
      const text = sec.innerText.toLowerCase();
      if (text.includes(query)) {
        sec.style.display = 'block';
      } else {
        sec.style.display = 'none';
      }
    });
  });
}

// ============================================================================
// 8. Mobile Drawer Toggle
// ============================================================================
function initMobileDrawer() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('docs-sidebar');

  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });

    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
      });
    });
  }
}

// ============================================================================
// Helper: Toast Notifications
// ============================================================================
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}
