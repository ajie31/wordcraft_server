# WordCraft

A word-building game with daily challenges. Play it at: https://wordcraft-d6102.web.app

## Recent Updates

### March 8, 2025
- Improved tutorial UI by repositioning to top-right corner
- Enhanced tutorial visibility with better highlighting effects
- Removed tutorial button from welcome screen for simplicity
- NOTE: Tutorial still has some UX issues with element highlighting and visibility

### July 3, 2025
- Fixed high score synchronization issues across devices
- Fixed multiple score submission bug
- Fixed refresh button UI overlap with tabs
- Improved error handling and network resilience

## Development Notes

### Git History
- The multiple score submission bug was fixed in commit 3a4bdf5
- High score synchronization across devices was improved in commits c95af30 and e3dc106

## Testing

Add `?test=true` to the URL to enable test mode, which allows:
- Multiple games per day
- Resetting the score submission flag