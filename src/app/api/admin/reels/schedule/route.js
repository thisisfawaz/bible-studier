<button
  type="button"
  onClick={async () => {
    const inputs = document.querySelectorAll('.reel-input');
    const newReels = [];
    inputs.forEach((input, idx) => {
      const videoId = input.value.trim();
      if (videoId) {
        const titleInput = input.parentElement.querySelector('.reel-title-input');
        newReels.push({
          videoId: videoId,
          title: titleInput ? titleInput.value.trim() || `Reel ${idx + 1}` : `Reel ${idx + 1}`
        });
      }
    });

    if (newReels.length === 0) {
      alert('Please add at least one video URL');
      return;
    }

    let successCount = 0;
    for (const reel of newReels) {
      try {
        const response = await fetch('/api/admin/reels/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reel: { ...reel, videoId: reel.videoId },
            scheduled: false
          })
        });
        const data = await response.json();
        console.log('📥 Save response:', data);  // ← ADD THIS
        if (data.success) successCount++;
      } catch (err) {
        console.error('Error saving reel:', err);
      }
    }

    alert(`✅ ${successCount} reels saved successfully!`);
    loadReels();
  }}
  style={{
    padding: '12px 32px',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }}
>
  💾 Save All Reels
</button>