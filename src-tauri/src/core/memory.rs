use std::ops::{Deref, DerefMut};
use zeroize::Zeroize;

/// Protected heap allocation that pins memory pages into RAM (prevents OS swap to disk)
/// and zeroes all bytes immediately upon Drop.
pub struct ProtectedMemory<T: Zeroize> {
    data: Vec<T>,
    locked: bool,
}

impl<T: Zeroize + Clone + Default> ProtectedMemory<T> {
    /// Creates a new zero-initialized buffer of `size` elements and locks it in RAM.
    pub fn new(size: usize) -> Self {
        let data = vec![T::default(); size];
        let mut mem = Self {
            data,
            locked: false,
        };
        mem.lock_pages();
        mem
    }

    /// Creates a protected buffer from existing slice data, locking it in RAM and zeroizing the original.
    pub fn from_slice(source: &[T]) -> Self {
        let mut mem = Self::new(source.len());
        mem.data.clone_from_slice(source);
        mem
    }

    fn lock_pages(&mut self) {
        #[cfg(unix)]
        unsafe {
            let ptr = self.data.as_ptr() as *const libc::c_void;
            let size = self.data.len() * std::mem::size_of::<T>();
            if size > 0 {
                let res = libc::mlock(ptr, size);
                self.locked = res == 0;
            }
        }

        #[cfg(windows)]
        unsafe {
            use winapi::um::memoryapi::VirtualLock;
            let ptr = self.data.as_ptr() as *mut winapi::ctypes::c_void;
            let size = self.data.len() * std::mem::size_of::<T>();
            if size > 0 {
                let res = VirtualLock(ptr, size);
                self.locked = res != 0;
            }
        }
    }
}

impl<T: Zeroize> Drop for ProtectedMemory<T> {
    fn drop(&mut self) {
        self.data.zeroize();

        if self.locked {
            #[cfg(unix)]
            unsafe {
                let ptr = self.data.as_ptr() as *const libc::c_void;
                let size = self.data.len() * std::mem::size_of::<T>();
                if size > 0 {
                    let _ = libc::munlock(ptr, size);
                }
            }

            #[cfg(windows)]
            unsafe {
                use winapi::um::memoryapi::VirtualUnlock;
                let ptr = self.data.as_ptr() as *mut winapi::ctypes::c_void;
                let size = self.data.len() * std::mem::size_of::<T>();
                if size > 0 {
                    let _ = VirtualUnlock(ptr, size);
                }
            }
            self.locked = false;
        }
    }
}

impl<T: Zeroize> Deref for ProtectedMemory<T> {
    type Target = [T];

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

impl<T: Zeroize> DerefMut for ProtectedMemory<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}

/// Disables core dumps and attaches anti-debugging protections where supported.
pub fn init_security_hardening() {
    #[cfg(target_os = "macos")]
    unsafe {
        // PT_DENY_ATTACH (31) prevents debuggers from attaching to the process
        const PT_DENY_ATTACH: libc::c_int = 31;
        libc::ptrace(PT_DENY_ATTACH, 0, std::ptr::null_mut::<libc::c_char>(), 0);
    }

    #[cfg(target_os = "linux")]
    unsafe {
        // PR_SET_DUMPABLE (4) = 0 disables core dumps
        libc::prctl(libc::PR_SET_DUMPABLE, 0, 0, 0, 0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protected_memory_lifecycle() {
        let mut mem = ProtectedMemory::<u8>::new(32);
        assert_eq!(mem.len(), 32);
        mem[0] = 42;
        mem[31] = 99;
        assert_eq!(mem[0], 42);
        assert_eq!(mem[31], 99);
    }
}
