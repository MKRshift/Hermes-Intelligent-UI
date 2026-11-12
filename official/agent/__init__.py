"""Native Hermes tool for publishing data-only OpenUI answers."""
from collections import OrderedDict
import json
import re
from threading import Lock

TOOL = "openui_show"
DESCRIPTION = (
    "Display an interactive OpenUI card inside the current Hermes Desktop chat. "
    "For requests in Hermes Visual mode, use this to show a working card in the chat. "
    "Pass OpenUI Lang source, not JavaScript, HTML, a Markdown fence, or a filename. Use positional arguments only."
)
SCHEMA = {
    "name": TOOL,
    "description": DESCRIPTION,
    "parameters": {
        "type": "object",
        "properties": {
            "program": {
                "type": "string",
                "description": (
                    "Complete OpenUI Lang program with root = Col([...]). Use positional arguments only. "
                    "Separate assignments with newlines. Initialize shared state with $name = value."
                ),
                "maxLength": 32000,
            },
        },
        "required": ["program"],
        "additionalProperties": False,
    },
}
MARKER = re.compile(r"\n--- Attached Context ---\s*\n\[HERMES OPENUI VISUAL\]\s+([a-f0-9]{16})\b")
ROOT = re.compile(r"^[ \t]*root[ \t]*=[ \t]*Col[ \t]*\(", re.M)


def register(ctx):
    turns = OrderedDict()
    lock = Lock()

    def begin(user_message="", session_id="", turn_id="", task_id="", **_):
        mark = MARKER.search(user_message) if isinstance(user_message, str) else None
        if not mark or not session_id or not turn_id or not task_id:
            return None
        with lock:
            turns[(session_id, turn_id)] = (task_id, mark[1], None)
            while len(turns) > 128:
                turns.popitem(last=False)
        return (
            "Hermes Visual mode is active. For a request to show or build an inline visual, "
            "call openui_show once with the complete program. It is the native renderer. "
            "Writing HTML or a file cannot deliver this card. After success, finish briefly "
            "without repeating the program. For ordinary prose questions, answer normally."
        )

    def show(args, session_id="", task_id="", **_):
        program = args.get("program")
        if (not isinstance(program, str) or len(program) > 32_000 or not ROOT.search(program)
                or "-->" in program or "\x00" in program):
            return json.dumps({"error": "Supply a complete OpenUI program starting with root = Col([...])."})
        with lock:
            key = next((key for key in reversed(turns) if key[0] == session_id and turns[key][0] == task_id), None)
            if key is None:
                return json.dumps({"error": "OpenUI is available from the Hermes Desktop Visual composer."})
            turns[key] = (task_id, turns[key][1], program.strip())
        return json.dumps({"success": True, "message": "The interactive card will appear in this chat."})

    def finish(response_text="", session_id="", turn_id="", **_):
        with lock:
            turn = turns.pop((session_id, turn_id), None)
        if turn is None:
            return None
        _, reference, program = turn
        if program is None:
            # Some models emit a fenced or bare program instead of calling the tool.
            fenced = re.search(r"```(?:openui(?:-lang)?|oui)\s*\n([\s\S]+?)\n```", response_text, re.I)
            candidate = (fenced[1] if fenced else response_text).strip()
            if ROOT.search(candidate) and len(candidate) <= 32_000 and "-->" not in candidate:
                program = candidate
        if program is not None:
            return f'::openui{{id="{reference}"}}\n\n<!--openui:{reference}\n{program}\n-->'
        return None

    ctx.register_tool(name=TOOL, toolset="hermes_intelligent_ui", schema=SCHEMA, handler=show,
                      description=DESCRIPTION, emoji="◇")
    ctx.register_hook("pre_llm_call", begin)
    ctx.register_hook("transform_llm_output", finish)
