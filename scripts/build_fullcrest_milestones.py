"""Compatibility entrypoint for unified historical Brave H.C. milestone artwork.

All six milestone families now use one authentic crest. Rebuilding only the
older seven items would overwrite the 29-medal manifest, so delegate.
"""
from build_unified_milestone_art import main

if __name__=="__main__":
    main()
