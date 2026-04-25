import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getTables } from '../api/tables';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/AuthContext';

function TableCard({ table }) {
  const occupied = String(table.status || '').toUpperCase() === 'OCUPADA';

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.tableName}>{table.name || `Mesa #${table.id}`}</Text>
        <Text style={styles.meta}>Capacidad: {table.capacity || '-'}</Text>
      </View>
      <View style={[styles.badge, occupied ? styles.badgeDanger : styles.badgeSuccess]}>
        <Text style={styles.badgeText}>{table.status || 'DISPONIBLE'}</Text>
      </View>
    </View>
  );
}

export default function TablesScreen({ navigation }) {
  const { logout } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTables = useCallback(async () => {
    try {
      setError('');
      const response = await getTables();
      setTables(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo cargar mesas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      ),
    });
  }, [navigation, logout]);

  if (loading) return <LoadingState />;

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={tables}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TableCard table={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadTables();
          }} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No hay mesas para mostrar</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 13,
  },
  badge: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeSuccess: {
    backgroundColor: '#16a34a',
  },
  badgeDanger: {
    backgroundColor: '#dc2626',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  error: {
    marginBottom: 8,
    color: '#dc2626',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    color: '#64748b',
  },
});
