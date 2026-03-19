import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, icon, parent_id } = req.body;
    
    if (!supabase) {
      const newCat = { id: Date.now().toString(), name, count: 0, icon: icon || '📁', parent_id: parent_id || null };
      return res.status(201).json(newCat);
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, icon: icon || '📁', count: 0, parent_id: parent_id || null }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      return res.status(204).send();
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.post('/seed', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase not connected' });
    }

    const mainCategories = [
      { name: 'Mobile Phones & Tablets', icon: '📱' },
      { name: 'Electronics', icon: '💻' },
      { name: 'Vehicles', icon: '🚗' },
      { name: 'Property', icon: '🏠' },
      { name: 'Home, Furniture & Appliances', icon: '🛋️' },
      { name: 'Health & Beauty', icon: '💄' },
      { name: 'Fashion', icon: '👕' },
      { name: 'Sports, Arts & Outdoors', icon: '⚽' },
      { name: 'Services', icon: '🛠️' },
      { name: 'Jobs', icon: '💼' },
      { name: 'Babies & Kids', icon: '👶' },
      { name: 'Pets', icon: '🐕' },
      { name: 'Agriculture & Food', icon: '🌾' },
      { name: 'Commercial Equipment & Tools', icon: '🏗️' },
    ];

    const { data: seededMain, error: mainError } = await supabase
      .from('categories')
      .insert(mainCategories)
      .select();

    if (mainError) throw mainError;

    const subCategories: any[] = [];
    
    const findId = (name: string) => seededMain?.find(c => c.name === name)?.id;

    // Mobile
    const mobileId = findId('Mobile Phones & Tablets');
    if (mobileId) {
      subCategories.push(
        { name: 'Mobile Phones', parent_id: mobileId, icon: '📱' },
        { name: 'Tablets', parent_id: mobileId, icon: '📟' },
        { name: 'Mobile Accessories', parent_id: mobileId, icon: '🎧' }
      );
    }

    // Electronics
    const electronicsId = findId('Electronics');
    if (electronicsId) {
      subCategories.push(
        { name: 'Laptops & Computers', parent_id: electronicsId, icon: '💻' },
        { name: 'TV & Video', parent_id: electronicsId, icon: '📺' },
        { name: 'Audio & Music', parent_id: electronicsId, icon: '🔊' },
        { name: 'Cameras', parent_id: electronicsId, icon: '📷' },
        { name: 'Video Games & Consoles', parent_id: electronicsId, icon: '🎮' },
        { name: 'Computer Accessories', parent_id: electronicsId, icon: '🖱️' }
      );
    }

    // Vehicles
    const vehiclesId = findId('Vehicles');
    if (vehiclesId) {
      subCategories.push(
        { name: 'Cars', parent_id: vehiclesId, icon: '🚗' },
        { name: 'Motorcycles', parent_id: vehiclesId, icon: '🏍️' },
        { name: 'Trucks & Trailers', parent_id: vehiclesId, icon: '🚛' },
        { name: 'Buses & Microbuses', parent_id: vehiclesId, icon: '🚌' },
        { name: 'Vehicle Parts & Accessories', parent_id: vehiclesId, icon: '⚙️' }
      );
    }

    // Property
    const propertyId = findId('Property');
    if (propertyId) {
      subCategories.push(
        { name: 'Houses & Apartments for Rent', parent_id: propertyId, icon: '🔑' },
        { name: 'Houses & Apartments for Sale', parent_id: propertyId, icon: '🏠' },
        { name: 'Land & Plots', parent_id: propertyId, icon: '🗺️' },
        { name: 'Commercial Property', parent_id: propertyId, icon: '🏢' }
      );
    }

    // Home
    const homeId = findId('Home, Furniture & Appliances');
    if (homeId) {
      subCategories.push(
        { name: 'Furniture', parent_id: homeId, icon: '🛋️' },
        { name: 'Kitchen Appliances', parent_id: homeId, icon: '🍳' },
        { name: 'Home Decor', parent_id: homeId, icon: '🖼️' },
        { name: 'Garden & Outdoor', parent_id: homeId, icon: '🌳' }
      );
    }

    const { data: seededSubs, error: subError } = await supabase
      .from('categories')
      .insert(subCategories)
      .select();

    if (subError) throw subError;

    res.json({ 
      message: 'Categories seeded successfully with hierarchy', 
      main: seededMain?.length,
      subs: seededSubs?.length 
    });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({ error: 'Failed to seed categories' });
  }
});

export default router;
