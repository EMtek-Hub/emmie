import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = session.user.id;
  const { 
    chatId, 
    decisions = [], 
    risks = [], 
    deadlines = [], 
    owners = [], 
    metrics = [], 
    notes = [] 
  } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  try {
    // Find chat and verify it belongs to a project in the user's org
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('project_id, org_id')
      .eq('id', chatId)
      .single();

    if (chatError) {
      console.error('Chat fetch error:', chatError);
      return res.status(500).json({ error: chatError.message });
    }

    if (!chat || chat.org_id !== EMTEK_ORG_ID || !chat.project_id) {
      return res.status(400).json({ error: 'Project chat not found or not accessible' });
    }

    const projectId = chat.project_id;

    // Prepare facts to insert
    const factsRows: any[] = [];
    
    // Process decisions
    for (const d of decisions) {
      if (d.label && d.value) {
        factsRows.push({
          project_id: projectId,
          kind: 'decision',
          label: d.label,
          value: d.value,
          owner: d.owner || null,
          date: d.date || null,
          created_by: userId
        });
      }
    }

    // Process risks
    for (const r of risks) {
      if (r.label && r.value) {
        factsRows.push({
          project_id: projectId,
          kind: 'risk',
          label: r.label,
          value: r.value,
          impact: r.impact || null,
          mitigation: r.mitigation || null,
          created_by: userId
        });
      }
    }

    // Process deadlines
    for (const dl of deadlines) {
      if (dl.label && dl.date) {
        factsRows.push({
          project_id: projectId,
          kind: 'deadline',
          label: dl.label,
          value: dl.label, // Use label as value for deadlines
          owner: dl.owner || null,
          date: dl.date,
          created_by: userId
        });
      }
    }

    // Process owners
    for (const o of owners) {
      if (o.label && o.person) {
        factsRows.push({
          project_id: projectId,
          kind: 'owner',
          label: o.label,
          value: o.person,
          owner: o.person,
          created_by: userId
        });
      }
    }

    // Process metrics
    for (const m of metrics) {
      if (m.label && m.value) {
        factsRows.push({
          project_id: projectId,
          kind: 'metric',
          label: m.label,
          value: m.value,
          date: m.as_of_date || null,
          created_by: userId
        });
      }
    }

    // Insert facts if any
    let insertedFacts = 0;
    if (factsRows.length > 0) {
      const { error: factsError } = await supabaseAdmin
        .from('project_facts')
        .insert(factsRows);

      if (factsError) {
        console.error('Facts insertion error:', factsError);
        return res.status(500).json({ error: 'Failed to save project facts' });
      }
      
      insertedFacts = factsRows.length;
    }

    // Prepare notes to insert
    const noteRows: any[] = [];
    for (const note of notes) {
      if (typeof note === 'string' && note.trim()) {
        noteRows.push({
          project_id: projectId,
          note_md: note.trim(),
          created_by: userId
        });
      }
    }

    // Insert notes if any
    let insertedNotes = 0;
    if (noteRows.length > 0) {
      const { error: notesError } = await supabaseAdmin
        .from('project_notes')
        .insert(noteRows);

      if (notesError) {
        console.error('Notes insertion error:', notesError);
        return res.status(500).json({ error: 'Failed to save project notes' });
      }

      insertedNotes = noteRows.length;
    }

    res.json({ 
      ok: true, 
      inserted: { 
        facts: insertedFacts, 
        notes: insertedNotes 
      } 
    });

  } catch (error) {
    console.error('Knowledge commit error:', error);
    return res.status(500).json({ error: 'Failed to commit knowledge' });
  }
}
