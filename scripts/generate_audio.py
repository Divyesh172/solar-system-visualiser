import math
import struct
import wave
import os

SAMPLE_RATE = 44100

def write_wav(filename, samples, sample_rate=SAMPLE_RATE, num_channels=1):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(num_channels)
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Clamp to 16-bit range
        packed = bytearray()
        for s in samples:
            val = max(-32767, min(32767, int(s * 32767.0)))
            packed.extend(struct.pack('<h', val))
        wav_file.writeframes(packed)
    print(f"Generated {filename} ({len(samples)} samples, {len(samples)/sample_rate:.2f}s)")

def generate_ambient_drone(filename):
    duration = 8.0 # Seamless 8-second loop
    total_samples = int(duration * SAMPLE_RATE)
    samples = []
    
    # 432Hz harmonic series with slow phase modulation (chorus)
    # Fundamental: 108Hz (A2), 216Hz (A3), 432Hz (A4), 648Hz (E5)
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        loop_phase = (2.0 * math.pi * i) / total_samples
        
        # Slow LFO for organic cosmic breathing
        lfo = 0.5 + 0.5 * math.sin(loop_phase)
        sub_lfo = 0.5 + 0.5 * math.cos(loop_phase * 2.0)
        
        # Sub-bass warmth (108 Hz)
        s1 = 0.35 * math.sin(2.0 * math.pi * 108.0 * t)
        # Warm octave (216 Hz with chorus)
        s2 = 0.25 * math.sin(2.0 * math.pi * (216.0 + 0.3 * math.sin(loop_phase)) * t)
        # Cosmic pad (432 Hz with chorus)
        s3 = 0.18 * math.sin(2.0 * math.pi * (432.0 + 0.5 * math.cos(loop_phase)) * t)
        # Gentle fifth overtone (648 Hz)
        s4 = 0.08 * math.sin(2.0 * math.pi * 648.0 * t) * lfo
        
        sample = (s1 + s2 + s3 + s4) * (0.8 + 0.2 * sub_lfo) * 0.35
        samples.append(sample)
        
    write_wav(filename, samples)

def generate_click(filename):
    duration = 0.045 # 45ms snappy clean UI click
    total_samples = int(duration * SAMPLE_RATE)
    samples = []
    
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        envelope = math.exp(-t * 90.0) # quick exponential decay
        # Soft pop transient dropping in pitch from 1200Hz to 300Hz
        freq = 300.0 + 900.0 * math.exp(-t * 120.0)
        sample = 0.45 * math.sin(2.0 * math.pi * freq * t) * envelope
        samples.append(sample)
        
    write_wav(filename, samples)

def generate_whoosh(filename):
    duration = 0.55 # 550ms smooth spatial whoosh
    total_samples = int(duration * SAMPLE_RATE)
    samples = []
    
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        norm_t = t / duration
        
        # Bell curve envelope: smooth ramp up and ramp down
        envelope = math.sin(norm_t * math.pi) ** 2.0
        
        # Pitch rises then falls
        center_freq = 180.0 + 320.0 * math.sin(norm_t * math.pi)
        
        # Multi-tone airy blend
        s1 = math.sin(2.0 * math.pi * center_freq * t)
        s2 = 0.5 * math.sin(2.0 * math.pi * (center_freq * 1.5) * t)
        s3 = 0.25 * math.sin(2.0 * math.pi * (center_freq * 2.2) * t)
        
        sample = (s1 + s2 + s3) * 0.32 * envelope
        samples.append(sample)
        
    write_wav(filename, samples)

def generate_chime(filename):
    duration = 0.85 # 850ms celestial arpeggio chime
    total_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * total_samples
    
    # 4 bell notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    notes = [
        (0.00, 523.25, 0.30),
        (0.12, 659.25, 0.32),
        (0.24, 783.99, 0.34),
        (0.36, 1046.50, 0.38),
    ]
    
    for start_t, freq, amp in notes:
        start_idx = int(start_t * SAMPLE_RATE)
        for i in range(start_idx, total_samples):
            local_t = (i - start_idx) / SAMPLE_RATE
            env = math.exp(-local_t * 6.5) # bell decay
            # Fundamental + soft sparkle overtone
            val = (math.sin(2.0 * math.pi * freq * local_t) + 
                   0.25 * math.sin(2.0 * math.pi * freq * 2.0 * local_t) +
                   0.10 * math.sin(2.0 * math.pi * freq * 3.0 * local_t)) * amp * env
            samples[i] += val
            
    write_wav(filename, samples)

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "audio")
    generate_ambient_drone(os.path.join(out_dir, "ambient_drone.wav"))
    generate_click(os.path.join(out_dir, "click.wav"))
    generate_whoosh(os.path.join(out_dir, "whoosh.wav"))
    generate_chime(os.path.join(out_dir, "chime.wav"))
    print("All audio files successfully generated!")
