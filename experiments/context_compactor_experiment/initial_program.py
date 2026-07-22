import json

def compact_history(messages: list, limit: int = 10):
    """
    Context Compaction Strategy:
    Summarizes earlier turns or trims the window to maintain reasoning density.
    """
    # EVOLVE-BLOCK-START
    if len(messages) <= limit:
        return messages
    return [messages[0]] + messages[-(limit - 1):]
    # EVOLVE-BLOCK-END
