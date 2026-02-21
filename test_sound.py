#!/usr/bin/env python3
"""Test sound generation"""

import pygame
import pygame.sndarray
import numpy as np
import time

print("Initializing pygame...")
pygame.init()

print("Initializing sound mixer...")
try:
    pygame.mixer.quit()
    pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
    print("✓ Sound mixer initialized successfully")
except Exception as e:
    print(f"✗ Failed to initialize sound mixer: {e}")
    exit(1)

def generate_sweep(start_freq, end_freq, duration, sample_rate=22050, volume=0.3):
    """Generate a frequency sweep sound effect"""
    print(f"  Generating sweep {start_freq}Hz -> {end_freq}Hz, {duration}s...")
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, False)
    
    # Create frequency sweep
    freq = np.linspace(start_freq, end_freq, num_samples)
    phase = np.cumsum(freq * 2 * np.pi / sample_rate)
    wave = np.sin(phase)
    
    # Apply envelope
    envelope = np.exp(-3 * t / duration)
    wave = wave * envelope * volume
    
    # Convert to 16-bit stereo (C-contiguous)
    wave = (wave * 32767).astype(np.int16)
    stereo_wave = np.column_stack((wave, wave)).astype(np.int16)
    
    print(f"  Array shape: {stereo_wave.shape}, dtype: {stereo_wave.dtype}, contiguous: {stereo_wave.flags['C_CONTIGUOUS']}")
    
    sound = pygame.sndarray.make_sound(stereo_wave.copy())
    print(f"  ✓ Sound created successfully")
    return sound


try:
    print("\nGenerating test sound...")
    test_sound = generate_sweep(800, 400, 0.5, volume=0.5)
    
    print("\nPlaying test sound...")
    test_sound.play()
    
    print("Waiting for sound to finish...")
    time.sleep(1)
    
    print("\n✓ Sound test completed successfully!")
    print("If you heard a descending tone, the sound system is working correctly.")
    
except Exception as e:
    print(f"\n✗ Sound test failed: {e}")
    import traceback
    traceback.print_exc()

pygame.quit()
