from importlib.util import module_from_spec, spec_from_file_location
import json
from pathlib import Path
import unittest

SPEC = spec_from_file_location("openui_agent", Path(__file__).resolve().parents[1] / "official/agent/__init__.py")
agent = module_from_spec(SPEC)
SPEC.loader.exec_module(agent)


class AgentPublishTest(unittest.TestCase):
    def test_card_is_bound_to_its_visual_turn(self):
        class Context:
            hooks = {}

            def register_hook(self, name, handler):
                self.hooks[name] = handler

            def register_tool(self, **tool):
                self.show = tool["handler"]

        ctx = Context()
        agent.register(ctx)
        start = ctx.hooks["pre_llm_call"]
        finish = ctx.hooks["transform_llm_output"]
        program = '$qty = 3\nroot = Col([Slider($qty, 1, 12, 1, "Quantity")])'
        reference = "1a2b3c4d5e6f7800"
        prompt = "Make a quote\n\n--- Attached Context ---\n\n[HERMES OPENUI VISUAL] " + reference
        start(prompt, session_id="a", turn_id="one", task_id="task")
        self.assertIn("error", json.loads(ctx.show({"program": program}, session_id="b", task_id="task")))
        self.assertIn("error", json.loads(ctx.show({"program": program + "-->"}, session_id="a", task_id="task")))
        self.assertTrue(json.loads(ctx.show({"program": program}, session_id="a", task_id="task"))["success"])
        self.assertIsNone(finish("Unrelated", session_id="b", turn_id="one"))
        reply = finish("Ready.", session_id="a", turn_id="one")
        self.assertEqual(reply, f'::openui{{id="{reference}"}}\n\n<!--openui:{reference}\n{program}\n-->')
        self.assertIsNone(finish("Unrelated", session_id="a", turn_id="one"))

        start(prompt, session_id="a", turn_id="two", task_id="task")
        self.assertEqual(finish(f"```openui\n{program}\n```", session_id="a", turn_id="two"), reply)


if __name__ == "__main__":
    unittest.main()
