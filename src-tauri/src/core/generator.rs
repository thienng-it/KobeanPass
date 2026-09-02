use rand::seq::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};

use super::errors::KobeanError;

// ============================================================================
// Password & Passphrase Generator
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordOptions {
    pub length: usize,
    pub uppercase: bool,
    pub lowercase: bool,
    pub digits: bool,
    pub symbols: bool,
    pub exclude_ambiguous: bool,
    pub exclude_chars: Option<String>,
    pub min_digits: Option<usize>,
    pub min_symbols: Option<usize>,
}

impl Default for PasswordOptions {
    fn default() -> Self {
        Self {
            length: 20,
            uppercase: true,
            lowercase: true,
            digits: true,
            symbols: true,
            exclude_ambiguous: false,
            exclude_chars: None,
            min_digits: Some(1),
            min_symbols: Some(1),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassphraseOptions {
    pub word_count: usize,
    pub separator: String,
    pub capitalize: bool,
    pub include_number: bool,
}

impl Default for PassphraseOptions {
    fn default() -> Self {
        Self {
            word_count: 6,
            separator: "-".to_string(),
            capitalize: true,
            include_number: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrengthResult {
    pub score: u8,
    pub label: String,
    pub crack_time: String,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedPassword {
    pub password: String,
    pub strength: StrengthResult,
    pub entropy_bits: f64,
}

const UPPERCASE_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
const DIGIT_CHARS: &[u8] = b"0123456789";
const SYMBOL_CHARS: &[u8] = b"!@#$%^&*()-_=+[]{}|;:,.<>?/";
const AMBIGUOUS_CHARS: &[u8] = b"0O1lI|";

pub fn generate_password(options: &PasswordOptions) -> Result<GeneratedPassword, KobeanError> {
    let mut pool: Vec<u8> = Vec::new();

    if options.uppercase {
        pool.extend_from_slice(UPPERCASE_CHARS);
    }
    if options.lowercase {
        pool.extend_from_slice(LOWERCASE_CHARS);
    }
    if options.digits {
        pool.extend_from_slice(DIGIT_CHARS);
    }
    if options.symbols {
        pool.extend_from_slice(SYMBOL_CHARS);
    }

    if options.exclude_ambiguous {
        pool.retain(|c| !AMBIGUOUS_CHARS.contains(c));
    }

    if let Some(ref exclusions) = options.exclude_chars {
        let excl_bytes = exclusions.as_bytes();
        pool.retain(|c| !excl_bytes.contains(c));
    }

    if pool.is_empty() {
        return Err(KobeanError::InvalidInput(
            "Character pool is empty with given options".into(),
        ));
    }

    let mut rng = rand::thread_rng();
    let length = options.length.clamp(8, 128);

    let password_bytes: Vec<u8> = (0..length)
        .map(|_| *pool.choose(&mut rng).unwrap())
        .collect();

    let password = String::from_utf8(password_bytes)
        .map_err(|e| KobeanError::InvalidInput(e.to_string()))?;

    let entropy = (length as f64) * (pool.len() as f64).log2();
    let strength = estimate_strength(&password);

    Ok(GeneratedPassword {
        password,
        strength,
        entropy_bits: (entropy * 100.0).round() / 100.0,
    })
}

const EFF_WORDLIST: &[&str] = &[
    "ability", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account",
    "accuse", "achieve", "acid", "acoustic", "acquire", "across", "action", "actor", "actress",
    "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
    "advice", "aerobic", "affair", "afford", "afraid", "again", "agent", "agree", "ahead", "aim",
    "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien", "all", "alley", "allow",
    "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing",
    "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry",
    "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety",
    "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area",
    "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive",
    "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist",
    "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
    "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
    "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
    "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
    "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
    "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
    "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
    "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
    "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
    "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
    "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
    "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken",
    "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo",
    "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus",
    "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage",
    "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe",
    "canvas", "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet",
    "carry", "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch",
    "category", "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement",
    "census", "century", "cereal", "certain", "chair", "chalk", "champion", "change", "chaos",
    "chapter", "charge", "chase", "chat", "cheap", "check", "cheese", "chef", "cherry", "chest",
    "chicken", "chief", "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk",
    "churn", "cigar", "cinnamon", "circle", "citizen", "city", "civil", "claim", "clap", "clarify",
    "claw", "clay", "clean", "clerk", "clever", "click", "client", "cliff", "climb", "clinic",
    "clip", "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump", "cluster",
    "clutch", "coach", "coast", "coconut", "code", "coffee", "coil", "coin", "collect", "color",
    "column", "combine", "come", "comfort", "comic", "common", "company", "concert", "conduct",
    "confirm", "congress", "connect", "consider", "control", "convince", "cook", "cool", "copper",
    "copy", "coral", "core", "corn", "correct", "cost", "cotton", "couch", "country", "couple",
    "course", "cousin", "cover", "coyote", "crack", "cradle", "craft", "cram", "crane", "crash",
    "crater", "crawl", "crazy", "cream", "credit", "creek", "crew", "cricket", "crime", "crisp",
    "critic", "crop", "cross", "crouch", "crowd", "crucial", "cruel", "cruise", "crumble", "crunch",
    "crush", "cry", "crystal", "cube", "culture", "cup", "cupboard", "curious", "current", "curtain",
    "curve", "cushion", "custom", "cute", "cycle", "dad", "damage", "damp", "dance", "danger",
    "daring", "dash", "daughter", "dawn", "day", "deal", "debate", "debris", "decade", "december",
    "decide", "decline", "decorate", "decrease", "deer", "defense", "define", "defy", "degree",
    "delay", "deliver", "demand", "demise", "denial", "dentist", "deny", "depart", "depend",
    "deposit", "depth", "deputy", "derive", "describe", "desert", "design", "desk", "despair",
    "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial", "diamond",
    "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner",
    "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder",
    "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog",
    "doll", "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove",
    "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink",
    "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch",
    "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east",
    "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight",
    "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite",
    "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty",
    "enable", "enact", "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine",
    "enhance", "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter", "entire",
    "entry", "envelope", "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error",
    "erupt", "escape", "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil",
    "evoke", "evolve", "exact", "example", "excess", "exchange", "excite", "exclude", "excuse",
    "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic", "expand",
    "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye", "eyebrow",
];

pub fn generate_passphrase(options: &PassphraseOptions) -> Result<GeneratedPassword, KobeanError> {
    let count = options.word_count.clamp(3, 12);
    let mut rng = rand::thread_rng();

    let mut words: Vec<String> = (0..count)
        .map(|_| {
            let w = *EFF_WORDLIST.choose(&mut rng).unwrap();
            if options.capitalize {
                let mut c = w.chars();
                match c.next() {
                    None => String::new(),
                    Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                }
            } else {
                w.to_string()
            }
        })
        .collect();

    if options.include_number {
        let num: u32 = rng.gen_range(10..99);
        if let Some(last) = words.last_mut() {
            last.push_str(&num.to_string());
        }
    }

    let password = words.join(&options.separator);
    let entropy = (count as f64) * (EFF_WORDLIST.len() as f64).log2();
    let strength = estimate_strength(&password);

    Ok(GeneratedPassword {
        password,
        strength,
        entropy_bits: (entropy * 100.0).round() / 100.0,
    })
}

pub fn estimate_strength(password: &str) -> StrengthResult {
    let entropy = zxcvbn::zxcvbn(password, &[]);
    let score_val = entropy.score();
    let score_u8: u8 = score_val.into();

    let (label, crack_time) = match score_u8 {
        0 => ("Very Weak", "Instant"),
        1 => ("Weak", "Minutes"),
        2 => ("Fair", "Days"),
        3 => ("Strong", "Years"),
        4 => ("Very Strong", "Centuries"),
        _ => ("Fair", "Unknown"),
    };

    let suggestions = entropy
        .feedback()
        .as_ref()
        .map(|f| {
            let mut list = Vec::new();
            if let Some(warning) = f.warning() {
                list.push(warning.to_string());
            }
            for s in f.suggestions() {
                list.push(s.to_string());
            }
            list
        })
        .unwrap_or_default();

    StrengthResult {
        score: score_u8,
        label: label.to_string(),
        crack_time: crack_time.to_string(),
        suggestions,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_generation_constraints() {
        let opts = PasswordOptions {
            length: 24,
            uppercase: true,
            lowercase: true,
            digits: true,
            symbols: true,
            exclude_ambiguous: true,
            ..Default::default()
        };

        let generated = generate_password(&opts).unwrap();
        assert_eq!(generated.password.len(), 24);
        assert!(generated.entropy_bits > 100.0);
    }

    #[test]
    fn test_passphrase_generation() {
        let opts = PassphraseOptions {
            word_count: 5,
            separator: "-".to_string(),
            capitalize: true,
            include_number: true,
        };

        let generated = generate_passphrase(&opts).unwrap();
        let parts: Vec<&str> = generated.password.split('-').collect();
        assert_eq!(parts.len(), 5);
        assert!(generated.strength.score >= 3);
    }
}
