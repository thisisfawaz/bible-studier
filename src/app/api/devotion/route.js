import { NextResponse } from 'next/server';

export async function GET() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const devotion = {
    title: "God's Faithful Provision",
    scripture: '"And my God will meet all your needs according to the riches of his glory in Christ Jesus." - Philippians 4:19',
    story: "In the 19th century, George Müller opened orphanages in Bristol, England, without ever asking for money—only praying and trusting God to provide. One morning, the children sat down with nothing on the tables. Müller and his staff prayed, and within minutes, a baker arrived, explaining that God had awakened him to bake bread for the orphans. Soon after, a milkman appeared whose cart had broken down; rather than let the milk spoil, he gave it all away. That day, every child ate a full meal. Müller recorded over 50,000 specific answers to prayer over his lifetime—proving that God is never late, even when we see no way forward.",
    category: "Faith",
    date: dateStr,
    prayer: "Heavenly Father, thank You for being our faithful Provider. Help us to trust You with our needs, knowing that You see us and care for us. When we face empty cupboards or uncertain futures, remind us of Your faithfulness in the past. Give us the courage to pray boldly and the patience to wait on Your perfect timing. In Jesus' name, Amen."
  };

  return NextResponse.json({ success: true, devotion });
}