#!/usr/bin/env python3
"""
Tests for Gossip Protocol
"""

import unittest
import asyncio
from gossip_coordinator import GossipCoordinator, AgentInfo, AgentState, GossipMessage


class TestGossipProtocol(unittest.TestCase):

    def test_agent_info_serialization(self):
        """Test AgentInfo serialization"""
        agent = AgentInfo(
            agent_id="test1",
            host="127.0.0.1",
            port=7946,
            state=AgentState.ALIVE,
            heartbeat=1,
            last_seen=0.0,
            metadata={"role": "scanner"}
        )

        # Serialize
        data = agent.to_dict()
        self.assertEqual(data['agent_id'], "test1")
        self.assertEqual(data['state'], "alive")

        # Deserialize
        agent2 = AgentInfo.from_dict(data)
        self.assertEqual(agent2.agent_id, "test1")
        self.assertEqual(agent2.state, AgentState.ALIVE)

    def test_gossip_message_digest(self):
        """Test message digest computation"""
        msg = GossipMessage(
            message_type="push",
            sender_id="test1",
            timestamp=123.456,
            agents=[]
        )

        digest = msg.compute_digest()
        self.assertIsNotNone(digest)
        self.assertEqual(len(digest), 16)

    def test_coordinator_creation(self):
        """Test coordinator initialization"""
        coord = GossipCoordinator("test1", "127.0.0.1", 7946)
        self.assertEqual(coord.agent_id, "test1")
        self.assertIn("test1", coord.agents)
        self.assertEqual(coord.agents["test1"].state, AgentState.ALIVE)

    def test_get_alive_agents(self):
        """Test alive agents filtering"""
        coord = GossipCoordinator("test1")

        # Add some agents
        coord.agents["test2"] = AgentInfo(
            agent_id="test2", host="127.0.0.1", port=7947,
            state=AgentState.ALIVE, heartbeat=1, last_seen=0.0, metadata={}
        )
        coord.agents["test3"] = AgentInfo(
            agent_id="test3", host="127.0.0.1", port=7948,
            state=AgentState.DEAD, heartbeat=1, last_seen=0.0, metadata={}
        )

        alive = coord.get_alive_agents()
        self.assertEqual(len(alive), 2)  # test1 and test2
        self.assertTrue(all(a.state == AgentState.ALIVE for a in alive))

    def test_stats(self):
        """Test statistics collection"""
        coord = GossipCoordinator("test1")
        stats = coord.get_stats()

        self.assertIn('total_agents', stats)
        self.assertIn('alive_agents', stats)
        self.assertEqual(stats['total_agents'], 1)
        self.assertEqual(stats['alive_agents'], 1)


class TestGossipIntegration(unittest.IsolatedAsyncioTestCase):

    async def test_two_agent_gossip(self):
        """Test gossip between two agents"""
        agent1 = GossipCoordinator("agent1", "127.0.0.1", 17946)
        agent2 = GossipCoordinator("agent2", "127.0.0.1", 17947)

        # Start agents in background
        task1 = asyncio.create_task(agent1.start())
        task2 = asyncio.create_task(agent2.start())

        await asyncio.sleep(0.5)  # Let them start

        # Join agent2 to agent1
        await agent2.join("127.0.0.1", 17946)

        await asyncio.sleep(2)  # Let them gossip

        # Both should know about each other
        self.assertIn("agent2", agent1.agents)
        self.assertIn("agent1", agent2.agents)

        # Stop agents
        await agent1.stop()
        await agent2.stop()

        task1.cancel()
        task2.cancel()

        try:
            await task1
        except asyncio.CancelledError:
            pass

        try:
            await task2
        except asyncio.CancelledError:
            pass


if __name__ == '__main__':
    unittest.main()
